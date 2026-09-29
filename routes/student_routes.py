from fastapi import APIRouter, Body, HTTPException, Path, Query, Response, status

from controllers import student_controller
from controllers.student_controller import DuplicateEmailError, StudentNotFoundError
from models.student_model import (
    ErrorResponse,
    StudentCreate,
    StudentListResponse,
    StudentResponse,
    StudentUpdate,
)

router = APIRouter(prefix="/students", tags=["Students"])

StudentId = Path(..., gt=0, description="Enter the student ID. Example: 1", examples=[1])

# Ready-made request bodies shown in Swagger's "Examples" dropdown.
CREATE_EXAMPLES = {
    f"student{i}": {"summary": f"Student {i}: {name}", "value": value}
    for i, (name, value) in enumerate(
        [
            ("Rahul Patel", {"name": "Rahul Patel", "email": "rahul@example.com", "course": "B.Tech Computer Engineering", "semester": 5}),
            ("Priya Shah", {"name": "Priya Shah", "email": "priya@example.com", "course": "B.Sc Information Technology", "semester": 6}),
            ("Amit Desai", {"name": "Amit Desai", "email": "amit@example.com", "course": "BCA", "semester": 4}),
            ("Neha Mehta", {"name": "Neha Mehta", "email": "neha@example.com", "course": "B.Tech Information Technology", "semester": 7}),
            ("Karan Joshi", {"name": "Karan Joshi", "email": "karan@example.com", "course": "B.Sc Computer Science", "semester": 3}),
        ],
        start=1,
    )
}
UPDATE_EXAMPLE = {
    "update": {
        "summary": "Move Rahul Patel to semester 6",
        "value": {"name": "Rahul Patel", "email": "rahul@example.com", "course": "B.Tech Computer Engineering", "semester": 6},
    }
}

BAD_REQUEST = {
    status.HTTP_400_BAD_REQUEST: {
        "model": ErrorResponse,
        "description": "Bad request. For example, the email already belongs to another student.",
    }
}
NOT_FOUND = {
    status.HTTP_404_NOT_FOUND: {
        "model": ErrorResponse,
        "description": "Student with the given ID was not found.",
    }
}
VALIDATION_ERROR = {
    422: {
        "description": "Validation error. Check the request data and make sure all required fields are correct.",
    }
}


@router.post(
    "",
    response_model=StudentResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Step 1: Create a New Student",
    description=(
        "Create a new student record. Pick a ready-made student from the **Examples** dropdown "
        "(or type your own name, email, course and semester), then click **Execute**.\n\n"
        "The student ID is created automatically. A successful request returns **201**."
    ),
    response_description="Student created successfully.",
    responses={**BAD_REQUEST, **VALIDATION_ERROR},
)
def create_student(student: StudentCreate = Body(..., openapi_examples=CREATE_EXAMPLES)):
    try:
        return student_controller.create_student(student)
    except DuplicateEmailError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get(
    "",
    response_model=StudentListResponse,
    status_code=status.HTTP_200_OK,
    summary="Step 2: Get All Students (Search, Filter & Pagination)",
    description=(
        "Get the list of students currently stored in the application.\n\n"
        "**All boxes are optional.** Leave them empty to see every student, or fill some in to:\n"
        "* **Search** by `name`\n"
        "* **Filter** by `course` and/or `semester`\n"
        "* **Paginate** with `page` and `limit`"
    ),
    response_description="Request completed successfully.",
    responses=VALIDATION_ERROR,
)
def get_all_students(
    name: str | None = Query(None, description="Optional. Search students by name (partial, not case-sensitive). Example: rahul", examples=["rahul"]),
    course: str | None = Query(None, description="Optional. Filter students by course (partial, not case-sensitive). Example: B.Tech", examples=["B.Tech"]),
    semester: int | None = Query(None, gt=0, description="Optional. Filter students by exact semester. Example: 5", examples=[5]),
    page: int = Query(1, ge=1, description="Optional. Page number. Default: 1"),
    limit: int = Query(10, gt=0, le=100, description="Optional. Number of students per page (1 to 100). Default: 10"),
):
    filtered = student_controller.get_all_students(name=name, course=course, semester=semester)
    return student_controller.paginate_students(filtered, page=page, limit=limit)


@router.get(
    "/{id}",
    response_model=StudentResponse,
    status_code=status.HTTP_200_OK,
    summary="Step 3: Get Student by ID",
    description=(
        "Enter an existing student ID to get that student's complete information.\n\n"
        "**Step 6:** after deleting a student, call this again with the same ID. It should return **404**."
    ),
    response_description="Request completed successfully.",
    responses={**NOT_FOUND, **VALIDATION_ERROR},
)
def get_student(id: int = StudentId):
    try:
        return student_controller.get_student_by_id(id)
    except StudentNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.put(
    "/{id}",
    response_model=StudentResponse,
    status_code=status.HTTP_200_OK,
    summary="Step 4: Update Student",
    description=(
        "Enter the student ID and provide the updated student information. "
        "All four fields are required. The student ID stays the same."
    ),
    response_description="Student updated successfully.",
    responses={**BAD_REQUEST, **NOT_FOUND, **VALIDATION_ERROR},
)
def update_student(
    student: StudentUpdate = Body(..., openapi_examples=UPDATE_EXAMPLE),
    id: int = StudentId,
):
    try:
        return student_controller.update_student(id, student)
    except StudentNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except DuplicateEmailError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.delete(
    "/{id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Step 5: Delete Student",
    description="Enter the student ID to permanently remove that student from the in-memory student list.",
    response_description="Student deleted successfully. No response body is returned.",
    responses={**NOT_FOUND, **VALIDATION_ERROR},
)
def delete_student(id: int = StudentId):
    try:
        student_controller.delete_student(id)
    except StudentNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    return Response(status_code=status.HTTP_204_NO_CONTENT)
