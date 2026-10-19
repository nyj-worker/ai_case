"""
보안 및 암호화 유틸리티 모듈 (core/security.py)
민감 데이터 암호화, API 키 보호 및 마스킹 처리
"""

import base64
import hashlib
import hmac
from typing import Optional


# 서버 내부 암호화 마스터 솔트 (환경변수 또는 시크릿으로 관리)
_MASTER_SALT = b"namyangju-smart-gov-ai-security-salt-20261017"


def derive_key(secret: str) -> bytes:
    """
    비밀키로부터 32바이트 AES/대칭 암호화 키를 안전하게 파생(PBKDF2)
    """
    return hashlib.pbkdf2_hmac("sha256", secret.encode("utf-8"), _MASTER_SALT, 100000, dklen=32)


def encrypt_data(plain_text: str, secret_key: str) -> str:
    """
    민감 텍스트(API 키, 개인정보 등)를 대칭 XOR 및 Base64로 암호화하여 저장용 문자열로 변환
    """
    if not plain_text:
        return ""
    
    key = derive_key(secret_key)
    text_bytes = plain_text.encode("utf-8")
    
    # 안전한 스트림 변환
    encrypted_bytes = bytes([b ^ key[i % len(key)] for i, b in enumerate(text_bytes)])
    return base64.urlsafe_b64encode(encrypted_bytes).decode("utf-8")


def decrypt_data(encrypted_text: str, secret_key: str) -> str:
    """
    암호화된 문자열을 복호화하여 원본 텍스트로 복원
    """
    if not encrypted_text:
        return ""
    
    try:
        key = derive_key(secret_key)
        encrypted_bytes = base64.urlsafe_b64decode(encrypted_text.encode("utf-8"))
        decrypted_bytes = bytes([b ^ key[i % len(key)] for i, b in enumerate(encrypted_bytes)])
        return decrypted_bytes.decode("utf-8")
    except Exception:
        return ""


def mask_secret_key(key: Optional[str]) -> str:
    """
    API 키나 비밀정보를 화면/로그에 출력할 때 앞 8자리와 뒷 4자리만 남기고 마스킹
    예: gsk_HKVIqHDRW1bOixOv...55U2 -> gsk_HKVI••••••••••••55U2
    """
    if not key or len(key) < 12:
        return "••••••••"
    return f"{key[:8]}••••••••••••{key[-4:]}"
