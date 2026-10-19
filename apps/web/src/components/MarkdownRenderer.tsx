/**
 * MarkdownRenderer.tsx
 * AI 챗봇 답변 및 정책 보고서의 마크다운(표 Table, 헤더, 번호 리스트, 볼드, 하이퍼링크 등)을 
 * 이솝(Aesop) 아포테카리 에디토리얼 스타일의 깔끔하고 아름다운 UI 컴포넌트로 완벽하게 변환합니다.
 */

import React from 'react';
import { ExternalLink } from 'lucide-react';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

/**
 * 인라인 텍스트(볼드, 인라인 코드, 마크다운 링크, 일반 URL)를 React 노드로 변환하는 헬퍼 함수
 */
export function renderInlineContent(text: string): React.ReactNode[] {
  if (!text) return [];

  // 토큰: 1) 마크다운 링크 [제목](URL), 2) 일반 URL, 3) 볼드 **텍스트**, 4) 인라인 코드 `코드`
  const tokenRegex = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)|(https?:\/\/[^\s)]+)|(\*\*[^*]+\*\*)|(`[^`]+`)/g;

  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = tokenRegex.exec(text)) !== null) {
    // 매치 이전 일반 텍스트 추가
    if (match.index > lastIndex) {
      nodes.push(text.substring(lastIndex, match.index));
    }

    if (match[1] && match[2]) {
      // 1) 마크다운 링크: [제목](URL)
      const linkText = match[1];
      const linkUrl = match[2];
      nodes.push(
        <a
          key={`md-link-${match.index}`}
          href={linkUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="aesop-external-link"
          title={`${linkText} 공식 원문 새 창으로 열기`}
        >
          <span>{linkText}</span>
          <ExternalLink className="link-icon" style={{ width: 11, height: 11, display: 'inline', marginLeft: 3, verticalAlign: 'middle' }} />
        </a>
      );
    } else if (match[3]) {
      // 2) 일반 URL: https://...
      const rawUrl = match[3];
      const cleanUrl = rawUrl.replace(/[.,;)]+$/, '');
      const trailing = rawUrl.substring(cleanUrl.length);

      nodes.push(
        <React.Fragment key={`raw-url-${match.index}`}>
          <a
            href={cleanUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="aesop-external-link"
            title="공식 출처 URL 새 창으로 열기"
          >
            <span>{cleanUrl}</span>
            <ExternalLink className="link-icon" style={{ width: 11, height: 11, display: 'inline', marginLeft: 3, verticalAlign: 'middle' }} />
          </a>
          {trailing}
        </React.Fragment>
      );
    } else if (match[4]) {
      // 3) 볼드 텍스트: **강조**
      const boldText = match[4].slice(2, -2);
      nodes.push(
        <strong key={`bold-${match.index}`} style={{ fontWeight: 700, color: 'var(--text-ink)' }}>
          {boldText}
        </strong>
      );
    } else if (match[5]) {
      // 4) 인라인 코드: `코드`
      const codeText = match[5].slice(1, -1);
      nodes.push(
        <code
          key={`code-${match.index}`}
          style={{
            fontFamily: 'monospace',
            backgroundColor: 'var(--bg-subtle)',
            color: 'var(--primary-amber-active)',
            padding: '2px 6px',
            borderRadius: 3,
            fontSize: 12,
            border: '1px solid var(--border-line)'
          }}
        >
          {codeText}
        </code>
      );
    }

    lastIndex = match.index + match[0].length;
  }

  // 남은 텍스트 추가
  if (lastIndex < text.length) {
    nodes.push(text.substring(lastIndex));
  }

  return nodes;
}

/**
 * 블록 타입 정의
 */
type MarkdownBlock =
  | { type: 'header'; level: number; text: string }
  | { type: 'numbered'; num: string; text: string }
  | { type: 'list'; items: string[] }
  | { type: 'table'; headers: string[]; rows: string[][] }
  | { type: 'paragraph'; text: string }
  | { type: 'empty' };

export default function MarkdownRenderer({ content, className = '' }: MarkdownRendererProps) {
  if (!content) return null;

  const rawLines = content.split('\n');
  const blocks: MarkdownBlock[] = [];
  let i = 0;

  while (i < rawLines.length) {
    const line = rawLines[i];
    const trimmed = line.trim();

    // 1. 빈 줄
    if (!trimmed) {
      blocks.push({ type: 'empty' });
      i++;
      continue;
    }

    // 2. 표(Table) 블록 감지
    // 패턴: | col1 | col2 | ...
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      const tableLines: string[] = [];
      while (i < rawLines.length && rawLines[i].trim().startsWith('|') && rawLines[i].trim().endsWith('|')) {
        tableLines.push(rawLines[i].trim());
        i++;
      }

      if (tableLines.length >= 2) {
        // 첫 번째 줄은 헤더
        const headerCells = tableLines[0]
          .split('|')
          .slice(1, -1)
          .map(c => c.trim());

        // 두 번째 줄이 구분선 (|---|---|)인지 확인
        const isSeparator = tableLines[1].replace(/[\s|:\-]/g, '').length === 0;
        const dataStartIndex = isSeparator ? 2 : 1;

        const rowCells: string[][] = [];
        for (let r = dataStartIndex; r < tableLines.length; r++) {
          const cells = tableLines[r]
            .split('|')
            .slice(1, -1)
            .map(c => c.trim());
          rowCells.push(cells);
        }

        blocks.push({
          type: 'table',
          headers: headerCells,
          rows: rowCells
        });
        continue;
      }
    }

    // 3. 헤더 (#, ##, ###)
    if (trimmed.startsWith('### ')) {
      blocks.push({ type: 'header', level: 3, text: trimmed.substring(4) });
      i++;
      continue;
    }
    if (trimmed.startsWith('## ')) {
      blocks.push({ type: 'header', level: 2, text: trimmed.substring(3) });
      i++;
      continue;
    }
    if (trimmed.startsWith('# ')) {
      blocks.push({ type: 'header', level: 1, text: trimmed.substring(2) });
      i++;
      continue;
    }

    // 4. 번호 매기기 목록 (1. , 2. 등)
    const numberedMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
    if (numberedMatch) {
      blocks.push({
        type: 'numbered',
        num: numberedMatch[1],
        text: numberedMatch[2]
      });
      i++;
      continue;
    }

    // 5. 불릿 리스트 (- 또는 *)
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      const listItems: string[] = [];
      while (i < rawLines.length && (rawLines[i].trim().startsWith('- ') || rawLines[i].trim().startsWith('* '))) {
        listItems.push(rawLines[i].trim().substring(2));
        i++;
      }
      blocks.push({ type: 'list', items: listItems });
      continue;
    }

    // 6. 일반 문단
    blocks.push({ type: 'paragraph', text: line });
    i++;
  }

  return (
    <div className={`aesop-markdown-renderer ${className}`} style={{ lineHeight: 1.8, fontSize: 13, color: 'var(--text-ink)' }}>
      {blocks.map((block, idx) => {
        switch (block.type) {
          case 'empty':
            return <div key={idx} style={{ height: 12 }} />;

          case 'header':
            if (block.level === 1) {
              return (
                <h2
                  key={idx}
                  style={{
                    fontFamily: 'var(--font-serif)',
                    fontSize: 20,
                    fontWeight: 700,
                    color: 'var(--text-ink)',
                    marginTop: 24,
                    marginBottom: 12,
                    borderBottom: '1px solid var(--border-line)',
                    paddingBottom: 6
                  }}
                >
                  {renderInlineContent(block.text)}
                </h2>
              );
            } else if (block.level === 2) {
              return (
                <h3
                  key={idx}
                  style={{
                    fontFamily: 'var(--font-serif)',
                    fontSize: 17,
                    fontWeight: 700,
                    color: 'var(--text-ink)',
                    marginTop: 20,
                    marginBottom: 10
                  }}
                >
                  {renderInlineContent(block.text)}
                </h3>
              );
            } else {
              return (
                <h4
                  key={idx}
                  style={{
                    fontFamily: 'var(--font-serif)',
                    fontSize: 15,
                    fontWeight: 700,
                    color: 'var(--primary-amber-active)',
                    marginTop: 16,
                    marginBottom: 8,
                    borderLeft: '3px solid var(--primary-amber)',
                    paddingLeft: 8
                  }}
                >
                  {renderInlineContent(block.text)}
                </h4>
              );
            }

          case 'numbered':
            return (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  gap: 8,
                  marginTop: 14,
                  marginBottom: 6
                }}
              >
                <span
                  style={{
                    fontFamily: 'monospace',
                    fontWeight: 700,
                    fontSize: 13,
                    color: '#FFFFFF',
                    backgroundColor: 'var(--primary-amber)',
                    width: 20,
                    height: 20,
                    borderRadius: '50%',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}
                >
                  {block.num}
                </span>
                <div style={{ flex: 1, fontWeight: 600, fontSize: 14, color: 'var(--text-ink)' }}>
                  {renderInlineContent(block.text)}
                </div>
              </div>
            );

          case 'list':
            return (
              <div key={idx} style={{ margin: '8px 0', paddingLeft: 6, display: 'flex', flexDirection: 'column', gap: 6 }}>
                {block.items.map((item, itemIdx) => (
                  <div key={itemIdx} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                    <span style={{ color: 'var(--primary-amber)', fontWeight: 'bold' }}>•</span>
                    <div style={{ flex: 1 }}>{renderInlineContent(item)}</div>
                  </div>
                ))}
              </div>
            );

          case 'table':
            return (
              <div
                key={idx}
                className="aesop-table-wrapper"
                style={{
                  margin: '16px 0',
                  overflowX: 'auto',
                  border: '1px solid var(--border-line)',
                  borderRadius: 'var(--radius-sharp)',
                  boxShadow: 'var(--shadow-subtle)',
                  backgroundColor: '#FFFFFF'
                }}
              >
                <table
                  className="aesop-md-table"
                  style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    fontSize: 12,
                    textAlign: 'left'
                  }}
                >
                  <thead>
                    <tr style={{ backgroundColor: 'var(--bg-subtle)', borderBottom: '2px solid var(--border-line)' }}>
                      {block.headers.map((h, hIdx) => (
                        <th
                          key={hIdx}
                          style={{
                            padding: '10px 14px',
                            fontWeight: 700,
                            color: 'var(--text-ink)',
                            fontFamily: 'var(--font-serif)',
                            whiteSpace: 'nowrap',
                            borderRight: hIdx < block.headers.length - 1 ? '1px solid var(--border-line)' : 'none'
                          }}
                        >
                          {renderInlineContent(h)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {block.rows.map((row, rIdx) => (
                      <tr
                        key={rIdx}
                        style={{
                          borderBottom: rIdx < block.rows.length - 1 ? '1px solid var(--border-line)' : 'none',
                          backgroundColor: rIdx % 2 === 0 ? '#FFFFFF' : 'var(--bg-canvas)'
                        }}
                      >
                        {row.map((cell, cIdx) => (
                          <td
                            key={cIdx}
                            style={{
                              padding: '10px 14px',
                              lineHeight: 1.6,
                              color: 'var(--text-ink)',
                              borderRight: cIdx < row.length - 1 ? '1px solid var(--border-line)' : 'none',
                              minWidth: cIdx === 0 ? 160 : 120
                            }}
                          >
                            {renderInlineContent(cell)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );

          case 'paragraph':
            return (
              <p key={idx} style={{ marginBottom: 6 }}>
                {renderInlineContent(block.text)}
              </p>
            );

          default:
            return null;
        }
      })}
    </div>
  );
}
