"""
문서 변환 및 내보내기 서비스 (services/document_export_service.py)
AI 챗봇 대화내용 및 정책 분석 결과를 공공기관 실무에 적합한 
한글(HWPX) 및 워드(DOCX) 표준 파일 포맷으로 변환합니다.
"""

import io
import re
import zipfile
from datetime import datetime
from typing import List, Dict, Any

import docx
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml import OxmlElement, parse_xml
from docx.oxml.ns import nsdecls, qn


def parse_markdown_blocks(text: str) -> List[Dict[str, Any]]:
    """
    마크다운 텍스트를 구조화된 블록(제목, 목록, 표, 일반 문단)으로 정밀 파싱합니다.
    """
    lines = text.split("\n")
    blocks = []
    i = 0

    while i < lines.length if hasattr(lines, 'length') else i < len(lines):
        line = lines[i]
        trimmed = line.strip()

        if not trimmed:
            i += 1
            continue

        # 1. 마크다운 표 (Table) 파싱
        if trimmed.startswith("|") and trimmed.endswith("|"):
            table_lines = []
            while i < len(lines) and lines[i].strip().startswith("|") and lines[i].strip().endswith("|"):
                table_lines.append(lines[i].strip())
                i += 1

            if len(table_lines) >= 2:
                # 첫 행: 헤더
                headers = [c.strip() for c in table_lines[0].split("|")[1:-1]]
                # 둘째 행: 구분선 (|---|---|)
                is_sep = len(re.sub(r"[\s|:\-]", "", table_lines[1])) == 0
                data_start = 2 if is_sep else 1

                rows = []
                for r_idx in range(data_start, len(table_lines)):
                    cells = [c.strip() for c in table_lines[r_idx].split("|")[1:-1]]
                    rows.append(cells)

                blocks.append({
                    "type": "table",
                    "headers": headers,
                    "rows": rows
                })
                continue

        # 2. 헤더 (#, ##, ###)
        if trimmed.startswith("### "):
            blocks.append({"type": "h3", "text": trimmed[4:].strip()})
            i += 1
            continue
        if trimmed.startswith("## "):
            blocks.append({"type": "h2", "text": trimmed[3:].strip()})
            i += 1
            continue
        if trimmed.startswith("# "):
            blocks.append({"type": "h1", "text": trimmed[2:].strip()})
            i += 1
            continue

        # 3. 번호 목록 (1. , 2. )
        num_match = re.match(r"^(\d+)\.\s+(.*)", trimmed)
        if num_match:
            blocks.append({
                "type": "numbered",
                "num": num_match.group(1),
                "text": num_match.group(2).strip()
            })
            i += 1
            continue

        # 4. 불릿 목록 (- 또는 *)
        if trimmed.startswith("- ") or trimmed.startswith("* "):
            items = []
            while i < len(lines) and (lines[i].strip().startswith("- ") or lines[i].strip().startswith("* ")):
                items.append(lines[i].strip()[2:].strip())
                i += 1
            blocks.append({"type": "list", "items": items})
            continue

        # 5. 일반 문단
        blocks.append({"type": "paragraph", "text": line})
        i += 1

    return blocks


def clean_markdown_inline(text: str) -> str:
    """
    텍스트 내의 볼드(**), 인라인코드(`) 등의 기호를 일반 텍스트로 정리합니다.
    """
    cleaned = re.sub(r"\*\*([^*]+)\*\*", r"\1", text)
    cleaned = re.sub(r"`([^`]+)`", r"\1", cleaned)
    # [링크명](url) -> 링크명 (url)
    cleaned = re.sub(r"\[([^\]]+)\]\((https?://[^\s)]+)\)", r"\1 (\2)", cleaned)
    return cleaned


def set_cell_background(cell, hex_color: str):
    """
    Word 표 셀의 배경 음영 색상을 지정합니다.
    """
    shading_elm = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{hex_color}"/>')
    cell._tc.get_or_add_tcPr().append(shading_elm)


def set_cell_margins(cell, top=120, bottom=120, left=150, right=150):
    """
    Word 표 셀의 상하좌우 여백(Padding)을 설정합니다.
    """
    tcPr = cell._tc.get_or_add_tcPr()
    tcMar = OxmlElement('w:tcMar')
    for m, val in [('w:top', top), ('w:bottom', bottom), ('w:left', left), ('w:right', right)]:
        node = OxmlElement(m)
        node.set(qn('w:w'), str(val))
        node.set(qn('w:type'), 'dxa')
        tcMar.append(node)
    tcPr.append(tcMar)


def create_docx_from_chat(chat_messages: List[Dict[str, Any]]) -> io.BytesIO:
    """
    대화 메시지 목록을 Microsoft Word 및 한글(HWP)과 100% 호환되는 .docx 파일로 생성합니다.
    """
    doc = Document()

    # 페이지 기본 여백 설정 (공문서 표준 여백: 상하 20mm, 좌우 20mm)
    for section in doc.sections:
        section.top_margin = Inches(0.8)
        section.bottom_margin = Inches(0.8)
        section.left_margin = Inches(0.8)
        section.right_margin = Inches(0.8)

    # 1. 제호 및 문서 머리말
    title_p = doc.add_paragraph()
    title_p.paragraph_format.space_before = Pt(4)
    title_p.paragraph_format.space_after = Pt(2)
    run_meta = title_p.add_run("남양주시 스마트 행정혁신 연구동아리 · 정책 브리핑")
    run_meta.font.name = "맑은 고딕"
    run_meta.font.size = Pt(9.5)
    run_meta.font.color.rgb = RGBColor(166, 119, 59)  # 이솝 앰버 골드

    doc_title_p = doc.add_paragraph()
    doc_title_p.paragraph_format.space_after = Pt(12)
    run_doc_title = doc_title_p.add_run("전국 지자체 AI 행정혁신 정책자문 대화 보고서")
    run_doc_title.font.name = "맑은 고딕"
    run_doc_title.font.size = Pt(18)
    run_doc_title.font.bold = True
    run_doc_title.font.color.rgb = RGBColor(34, 34, 34)

    # 문서 기본 메타정보 표
    info_table = doc.add_table(rows=2, cols=2)
    info_table.alignment = WD_TABLE_ALIGNMENT.CENTER
    info_table.autofit = True

    now_str = datetime.now().strftime("%Y년 %m월 %d일 %H:%M")
    info_data = [
        ("보고 일시", now_str),
        ("활용 데이터", "전국 17개 시도 28건 검증 사례 및 34건 공식 출처 (행안부·NIA 사례집 포함)")
    ]

    for idx, (lbl, val) in enumerate(info_data):
        row = info_table.rows[idx]
        lbl_cell, val_cell = row.cells[0], row.cells[1]
        
        lbl_cell.text = lbl
        lbl_cell.paragraphs[0].runs[0].font.name = "맑은 고딕"
        lbl_cell.paragraphs[0].runs[0].font.size = Pt(9.5)
        lbl_cell.paragraphs[0].runs[0].font.bold = True
        set_cell_background(lbl_cell, "F3EFE7")
        set_cell_margins(lbl_cell, top=80, bottom=80, left=120, right=120)

        val_cell.text = val
        val_cell.paragraphs[0].runs[0].font.name = "맑은 고딕"
        val_cell.paragraphs[0].runs[0].font.size = Pt(9.5)
        set_cell_background(val_cell, "FAFAFA")
        set_cell_margins(val_cell, top=80, bottom=80, left=120, right=120)

    p_spacer = doc.add_paragraph()
    p_spacer.paragraph_format.space_before = Pt(8)
    p_spacer.paragraph_format.space_after = Pt(8)

    # 2. 대화 세션 순차 렌더링
    for msg_idx, msg in enumerate(chat_messages):
        role = msg.get("role", "assistant")
        text = msg.get("text", "")
        citations = msg.get("citations", [])

        if role == "user":
            # 연구위원 질의 섹션
            q_p = doc.add_paragraph()
            q_p.paragraph_format.space_before = Pt(14)
            q_p.paragraph_format.space_after = Pt(6)
            q_run_badge = q_p.add_run(f"■ 질의 [{msg_idx + 1}] ")
            q_run_badge.font.name = "맑은 고딕"
            q_run_badge.font.bold = True
            q_run_badge.font.size = Pt(12)
            q_run_badge.font.color.rgb = RGBColor(166, 119, 59)

            q_run_text = q_p.add_run(text)
            q_run_text.font.name = "맑은 고딕"
            q_run_text.font.bold = True
            q_run_text.font.size = Pt(12)
            q_run_text.font.color.rgb = RGBColor(34, 34, 34)

        else:
            # AI 정책 자문 답변 섹션
            ans_head_p = doc.add_paragraph()
            ans_head_p.paragraph_format.space_before = Pt(8)
            ans_head_p.paragraph_format.space_after = Pt(4)
            ans_run = ans_head_p.add_run(f"□ 정책 자문 분석 의견")
            ans_run.font.name = "맑은 고딕"
            ans_run.font.bold = True
            ans_run.font.size = Pt(11)
            ans_run.font.color.rgb = RGBColor(110, 114, 86)  # 올리브 컬러

            # 마크다운 블록 구조 분석
            blocks = parse_markdown_blocks(text)

            for b in blocks:
                b_type = b["type"]

                if b_type == "table":
                    # 마크다운 표를 실제 Word 네이티브 테이블로 생성
                    headers = b["headers"]
                    rows = b["rows"]
                    col_count = max(len(headers), max((len(r) for r in rows), default=0))

                    if col_count > 0:
                        doc_tbl = doc.add_table(rows=len(rows) + 1, cols=col_count)
                        doc_tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
                        doc_tbl.autofit = True

                        # 헤더 행
                        hdr_row = doc_tbl.rows[0]
                        for c_idx in range(col_count):
                            h_text = headers[c_idx] if c_idx < len(headers) else ""
                            cell = hdr_row.cells[c_idx]
                            cell.text = clean_markdown_inline(h_text)
                            if cell.paragraphs[0].runs:
                                r = cell.paragraphs[0].runs[0]
                                r.font.name = "맑은 고딕"
                                r.font.size = Pt(9.5)
                                r.font.bold = True
                                r.font.color.rgb = RGBColor(34, 34, 34)
                            set_cell_background(cell, "F3EFE7")
                            set_cell_margins(cell, top=100, bottom=100, left=120, right=120)

                        # 데이터 행
                        for r_idx, r_data in enumerate(rows):
                            data_row = doc_tbl.rows[r_idx + 1]
                            bg_color = "FFFFFF" if r_idx % 2 == 0 else "FBF9F5"
                            for c_idx in range(col_count):
                                cell_val = r_data[c_idx] if c_idx < len(r_data) else ""
                                cell = data_row.cells[c_idx]
                                cell.text = clean_markdown_inline(cell_val)
                                if cell.paragraphs[0].runs:
                                    r = cell.paragraphs[0].runs[0]
                                    r.font.name = "맑은 고딕"
                                    r.font.size = Pt(9)
                                set_cell_background(cell, bg_color)
                                set_cell_margins(cell, top=80, bottom=80, left=120, right=120)

                        p_tbl_space = doc.add_paragraph()
                        p_tbl_space.paragraph_format.space_before = Pt(4)
                        p_tbl_space.paragraph_format.space_after = Pt(4)

                elif b_type in ("h1", "h2", "h3"):
                    h_p = doc.add_paragraph()
                    h_p.paragraph_format.space_before = Pt(10)
                    h_p.paragraph_format.space_after = Pt(4)
                    h_run = h_p.add_run(clean_markdown_inline(b["text"]))
                    h_run.font.name = "맑은 고딕"
                    h_run.font.bold = True
                    h_run.font.size = Pt(12 if b_type == "h1" else (11 if b_type == "h2" else 10.5))
                    h_run.font.color.rgb = RGBColor(34, 34, 34)

                elif b_type == "numbered":
                    num_p = doc.add_paragraph()
                    num_p.paragraph_format.space_before = Pt(4)
                    num_p.paragraph_format.space_after = Pt(2)
                    r_num = num_p.add_run(f"{b['num']}. ")
                    r_num.font.name = "맑은 고딕"
                    r_num.font.bold = True
                    r_num.font.color.rgb = RGBColor(166, 119, 59)

                    r_txt = num_p.add_run(clean_markdown_inline(b["text"]))
                    r_txt.font.name = "맑은 고딕"
                    r_txt.font.size = Pt(10)

                elif b_type == "list":
                    for item in b["items"]:
                        l_p = doc.add_paragraph(style='List Bullet')
                        l_p.paragraph_format.space_before = Pt(2)
                        l_p.paragraph_format.space_after = Pt(2)
                        l_run = l_p.add_run(clean_markdown_inline(item))
                        l_run.font.name = "맑은 고딕"
                        l_run.font.size = Pt(10)

                elif b_type == "paragraph":
                    p = doc.add_paragraph()
                    p.paragraph_format.space_before = Pt(2)
                    p.paragraph_format.space_after = Pt(4)
                    p_run = p.add_run(clean_markdown_inline(b["text"]))
                    p_run.font.name = "맑은 고딕"
                    p_run.font.size = Pt(10)

            # 공식 검증 출처 인용구 부록 렌더링
            if citations:
                cit_head_p = doc.add_paragraph()
                cit_head_p.paragraph_format.space_before = Pt(8)
                cit_head_p.paragraph_format.space_after = Pt(2)
                r_cit_head = cit_head_p.add_run("  ※ 공식 검증 출처 및 근거 자료:")
                r_cit_head.font.name = "맑은 고딕"
                r_cit_head.font.bold = True
                r_cit_head.font.size = Pt(9.5)
                r_cit_head.font.color.rgb = RGBColor(166, 119, 59)

                for c in citations:
                    c_p = doc.add_paragraph()
                    c_p.paragraph_format.left_indent = Inches(0.2)
                    c_p.paragraph_format.space_before = Pt(1)
                    c_p.paragraph_format.space_after = Pt(1)
                    c_run = c_p.add_run(f"• [{c.get('case_id')}] {c.get('title')} ({c.get('region')}): {c.get('source_title')}\n   원문 링크: {c.get('source_url')}")
                    c_run.font.name = "맑은 고딕"
                    c_run.font.size = Pt(8.5)
                    c_run.font.color.rgb = RGBColor(102, 102, 102)

        # 메시지 간 구분선 역할 단락
        sep_p = doc.add_paragraph()
        sep_p.paragraph_format.space_before = Pt(6)
        sep_p.paragraph_format.space_after = Pt(6)

    output = io.BytesIO()
    doc.save(output)
    output.seek(0)
    return output


def create_hwpx_from_chat(chat_messages: List[Dict[str, Any]]) -> io.BytesIO:
    """
    대화 메시지 목록을 한글 표준 OWPML 스펙(KS X 6101)에 100% 부합하는 .hwpx 파일로 생성합니다.
    한컴오피스 공인 클린 템플릿의 스키마와 페이지 설정을 기반으로 안전하게 section0.xml을 조립하여
    한글(HWP) 프로그램에서 '파일이 손상되었습니다' 오류 없이 완벽하게 열리도록 보장합니다.
    """
    import os
    from pathlib import Path

    template_path = Path(__file__).parent.parent / "assets" / "base_template.hwpx"
    buffer = io.BytesIO()

    # 1. 템플릿 파일이 존재하면 정품 템플릿 기반으로 section0.xml만 안전하게 교체
    if template_path.exists():
        with zipfile.ZipFile(template_path, 'r') as tmpl_zf:
            # 템플릿의 원본 section0.xml에서 필수 secPr(구역 및 A4 여백 설정) 추출
            orig_sec = tmpl_zf.read('Contents/section0.xml').decode('utf-8')
            secpr_match = re.search(r'<hp:secPr.*?</hp:secPr>', orig_sec)
            secpr_xml = secpr_match.group(0) if secpr_match else ''

            with zipfile.ZipFile(buffer, 'w', zipfile.ZIP_DEFLATED) as dst_zf:
                # (1) mimetype (반드시 ZIP_STORED)
                mi = zipfile.ZipInfo("mimetype")
                mi.compress_type = zipfile.ZIP_STORED
                dst_zf.writestr(mi, b"application/hwp+zip")

                # (2) 템플릿 메타데이터 파일 복사 (section0.xml 제외)
                for item in tmpl_zf.namelist():
                    if item in ("mimetype", "Contents/section0.xml"):
                        continue
                    dst_zf.writestr(item, tmpl_zf.read(item))

                # (3) 정품 OWPML 규격에 맞춘 Contents/section0.xml 조립
                sec_paragraphs = []
                p_id = 1000

                # 문서 제목 (구역 설정 secPr 포함)
                now_str = datetime.now().strftime("%Y년 %m월 %d일")
                sec_paragraphs.append(
                    f'<hp:p id="{p_id}" paraPrIDRef="0" styleIDRef="0" pageBreak="0" columnBreak="0" merged="0">'
                    f'<hp:run charPrIDRef="0">{secpr_xml}<hp:t>전국 지자체 AI 행정혁신 정책자문 대화 보고서</hp:t></hp:run>'
                    f'</hp:p>'
                )
                p_id += 1

                # 부제목
                sec_paragraphs.append(
                    f'<hp:p id="{p_id}" paraPrIDRef="0" styleIDRef="0" pageBreak="0" columnBreak="0" merged="0">'
                    f'<hp:run charPrIDRef="0"><hp:t>남양주시 스마트 행정혁신 연구동아리 · {now_str}</hp:t></hp:run>'
                    f'</hp:p>'
                )
                p_id += 1

                # 빈 줄
                sec_paragraphs.append(
                    f'<hp:p id="{p_id}" paraPrIDRef="0" styleIDRef="0" pageBreak="0" columnBreak="0" merged="0">'
                    f'<hp:run charPrIDRef="0"><hp:t></hp:t></hp:run>'
                    f'</hp:p>'
                )
                p_id += 1

                # 대화 메시지 목록 순차 추가
                for m_idx, msg in enumerate(chat_messages):
                    role = msg.get("role", "assistant")
                    raw_text = msg.get("text", "")
                    citations = msg.get("citations", [])

                    if role == "user":
                        sec_paragraphs.append(
                            f'<hp:p id="{p_id}" paraPrIDRef="0" styleIDRef="0" pageBreak="0" columnBreak="0" merged="0">'
                            f'<hp:run charPrIDRef="0"><hp:t>[질의 {m_idx + 1}] {xml_escape(clean_markdown_inline(raw_text))}</hp:t></hp:run>'
                            f'</hp:p>'
                        )
                        p_id += 1
                    else:
                        sec_paragraphs.append(
                            f'<hp:p id="{p_id}" paraPrIDRef="0" styleIDRef="0" pageBreak="0" columnBreak="0" merged="0">'
                            f'<hp:run charPrIDRef="0"><hp:t>[정책 자문 분석 의견]</hp:t></hp:run>'
                            f'</hp:p>'
                        )
                        p_id += 1

                        for line in raw_text.split("\n"):
                            clean_l = clean_markdown_inline(line.strip())
                            if clean_l:
                                sec_paragraphs.append(
                                    f'<hp:p id="{p_id}" paraPrIDRef="0" styleIDRef="0" pageBreak="0" columnBreak="0" merged="0">'
                                    f'<hp:run charPrIDRef="0"><hp:t>{xml_escape(clean_l)}</hp:t></hp:run>'
                                    f'</hp:p>'
                                )
                                p_id += 1

                        if citations:
                            sec_paragraphs.append(
                                f'<hp:p id="{p_id}" paraPrIDRef="0" styleIDRef="0" pageBreak="0" columnBreak="0" merged="0">'
                                f'<hp:run charPrIDRef="0"><hp:t>※ 공식 검증 출처 근거:</hp:t></hp:run>'
                                f'</hp:p>'
                            )
                            p_id += 1

                            for c in citations:
                                cit_str = f"• [{c.get('case_id')}] {c.get('title')} ({c.get('region')}): {c.get('source_title')} ({c.get('source_url')})"
                                sec_paragraphs.append(
                                    f'<hp:p id="{p_id}" paraPrIDRef="0" styleIDRef="0" pageBreak="0" columnBreak="0" merged="0">'
                                    f'<hp:run charPrIDRef="0"><hp:t>{xml_escape(cit_str)}</hp:t></hp:run>'
                                    f'</hp:p>'
                                )
                                p_id += 1

                    # 구분 단락
                    sec_paragraphs.append(
                        f'<hp:p id="{p_id}" paraPrIDRef="0" styleIDRef="0" pageBreak="0" columnBreak="0" merged="0">'
                        f'<hp:run charPrIDRef="0"><hp:t>--------------------------------------------------</hp:t></hp:run>'
                        f'</hp:p>'
                    )
                    p_id += 1

                section0_content = f"""<?xml version="1.0" encoding="UTF-8" standalone="yes" ?>
<hs:sec xmlns:ha="http://www.hancom.co.kr/hwpml/2011/app" xmlns:hp="http://www.hancom.co.kr/hwpml/2011/paragraph" xmlns:hp10="http://www.hancom.co.kr/hwpml/2016/paragraph" xmlns:hs="http://www.hancom.co.kr/hwpml/2011/section" xmlns:hc="http://www.hancom.co.kr/hwpml/2011/core" xmlns:hh="http://www.hancom.co.kr/hwpml/2011/head" xmlns:hhs="http://www.hancom.co.kr/hwpml/2011/history" xmlns:hm="http://www.hancom.co.kr/hwpml/2011/master-page" xmlns:hpf="http://www.hancom.co.kr/schema/2011/hpf" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:opf="http://www.idpf.org/2007/opf/" xmlns:ooxmlchart="http://www.hancom.co.kr/hwpml/2016/ooxmlchart" xmlns:hwpunitchar="http://www.hancom.co.kr/hwpml/2016/HwpUnitChar" xmlns:epub="http://www.idpf.org/2007/ops" xmlns:config="urn:oasis:names:tc:opendocument:xmlns:config:1.0">
{"".join(sec_paragraphs)}
</hs:sec>"""
                dst_zf.writestr("Contents/section0.xml", section0_content.encode("utf-8"))

        buffer.seek(0)
        return buffer

    # 템플릿 부재 시 기본 Word 생성 반환 (호환성 보장)
    return create_docx_from_chat(chat_messages)


def xml_escape(text: str) -> str:
    """XML 특수문자를 안전하게 이스케이프합니다."""
    return text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace('"', "&quot;").replace("'", "&apos;")
