"""
남양주시 정책 실행 과제 관리 API (api/v1/tasks.py)
칸반 보드 및 로드맵 진행 현황 관리 (발굴 -> 검토 -> 타당성조사 -> 시범운영 -> 정식운영)
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.entities import PolicyTaskModel
from app.schemas.schemas import TaskResponse, TaskCreate, TaskUpdate

router = APIRouter(prefix="/tasks", tags=["정책 실행 관리"])


@router.get("", response_model=List[TaskResponse])
def get_tasks(
    status: Optional[str] = Query(None, description="진행 상태 필터"),
    priority: Optional[str] = Query(None, description="우선순위 필터"),
    dept: Optional[str] = Query(None, description="담당 부서 필터"),
    db: Session = Depends(get_db)
):
    """
    남양주시 정책 실행 과제 목록 조회
    """
    q = db.query(PolicyTaskModel)
    if status:
        q = q.filter(PolicyTaskModel.status == status)
    if priority:
        q = q.filter(PolicyTaskModel.priority == priority)
    if dept:
        q = q.filter(PolicyTaskModel.target_dept.ilike(f"%{dept}%"))
    return q.order_by(PolicyTaskModel.created_at.desc()).all()


@router.post("", response_model=TaskResponse)
def create_task(task_in: TaskCreate, db: Session = Depends(get_db)):
    """
    신규 정책 과제 등록 (후보 정책을 실제 추진 과제로 전환)
    """
    count = db.query(PolicyTaskModel).count()
    new_id = f"TASK_{count + 1:03d}"

    new_task = PolicyTaskModel(
        id=new_id,
        case_id=task_in.case_id,
        task_name=task_in.task_name,
        target_dept=task_in.target_dept,
        manager=task_in.manager,
        status=task_in.status,
        priority=task_in.priority,
        start_date=task_in.start_date,
        target_date=task_in.target_date,
        progress=task_in.progress,
        budget_allocated=task_in.budget_allocated,
        key_kpi=task_in.key_kpi,
        notes=task_in.notes
    )
    db.add(new_task)
    db.commit()
    db.refresh(new_task)
    return new_task


@router.patch("/{id}", response_model=TaskResponse)
def update_task(id: str, update_in: TaskUpdate, db: Session = Depends(get_db)):
    """
    과제 상태, 진행률 및 내용 업데이트 (칸반 드래그 앤 드롭 지원)
    """
    task = db.query(PolicyTaskModel).filter(PolicyTaskModel.id == id).first()
    if not task:
        raise HTTPException(status_code=404, detail="해당 과제를 찾을 수 없습니다.")

    update_data = update_in.dict(exclude_unset=True)
    for field, val in update_data.items():
        setattr(task, field, val)

    db.commit()
    db.refresh(task)
    return task


@router.delete("/{id}")
def delete_task(id: str, db: Session = Depends(get_db)):
    """
    과제 삭제
    """
    task = db.query(PolicyTaskModel).filter(PolicyTaskModel.id == id).first()
    if not task:
        raise HTTPException(status_code=404, detail="해당 과제를 찾을 수 없습니다.")
    db.delete(task)
    db.commit()
    return {"message": "과제가 성공적으로 삭제되었습니다.", "id": id}
