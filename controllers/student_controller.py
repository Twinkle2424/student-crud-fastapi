from models.student_model import Student, StudentCreate, StudentUpdate

# In-memory storage: student ID -> Student. No database is used.
students: dict[int, Student] = {}
_next_id = 1


class StudentNotFoundError(Exception):
    """Raised when no student exists with the requested ID."""

    def __init__(self, student_id: int):
        self.student_id = student_id
        super().__init__(f"Student with ID {student_id} not found")


class DuplicateEmailError(Exception):
    """Raised when another student already uses the given email."""

    def __init__(self, email: str):
        self.email = email
        super().__init__(f"A student with email {email} already exists")


def _ensure_email_unique(email: str, exclude_id: int | None = None) -> None:
    for student in students.values():
        if student.id != exclude_id and student.email.lower() == email.lower():
            raise DuplicateEmailError(email)


def create_student(data: StudentCreate) -> Student:
    global _next_id
    _ensure_email_unique(data.email)
    student = Student(id=_next_id, **data.model_dump())
    students[student.id] = student
    _next_id += 1
    return student


def get_all_students(
    name: str | None = None,
    course: str | None = None,
    semester: int | None = None,
) -> list[Student]:
    """Return all students, optionally filtered.

    name and course are case-insensitive partial matches; semester is exact.
    """
    result = list(students.values())
    if name:
        result = [s for s in result if name.strip().lower() in s.name.lower()]
    if course:
        result = [s for s in result if course.strip().lower() in s.course.lower()]
    if semester is not None:
        result = [s for s in result if s.semester == semester]
    return result


def paginate_students(items: list[Student], page: int, limit: int) -> dict:
    """Slice a list of students into one page and return page metadata."""
    total = len(items)
    start = (page - 1) * limit
    return {
        "page": page,
        "limit": limit,
        "total": total,
        "total_pages": (total + limit - 1) // limit,
        "students": items[start:start + limit],
    }


def get_student_by_id(student_id: int) -> Student:
    student = students.get(student_id)
    if student is None:
        raise StudentNotFoundError(student_id)
    return student


def update_student(student_id: int, data: StudentUpdate) -> Student:
    get_student_by_id(student_id)
    _ensure_email_unique(data.email, exclude_id=student_id)
    updated = Student(id=student_id, **data.model_dump())
    students[student_id] = updated
    return updated


def delete_student(student_id: int) -> None:
    get_student_by_id(student_id)
    del students[student_id]
