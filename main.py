from pathlib import Path

from fastapi import FastAPI
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from routes.student_routes import router as student_router

DESCRIPTION = """
A simple REST API for managing university student records.

> **Prefer a visual interface?** Open the Student Management dashboard at [`/`](/). It performs the same CRUD operations with forms and buttons.

### Beginner Testing Guide

Open an endpoint below, fill in the fields, and click **Execute**.
Follow the steps in order:

| Step | Endpoint | What to do |
|------|----------|------------|
| 1 | `POST /students` | Create a few students (pick a ready-made example from the dropdown) |
| 2 | `GET /students` | View all students |
| 3 | `GET /students/{id}` | View one student, e.g. ID `1` |
| 4 | `PUT /students/{id}` | Update that student |
| 5 | `DELETE /students/{id}` | Delete that student |
| 6 | `GET /students/{id}` | Check that the deleted student now returns **404** |

**Bonus:** `GET /students` can also search, filter and paginate. Every box on it is optional.

### Good to know

* Student IDs are created automatically (1, 2, 3, ...). You never type an ID when creating a student.
* Data is stored temporarily in memory. **No database is used**, so restarting the server clears all students.
"""

app = FastAPI(
    title="Student CRUD API",
    description=DESCRIPTION,
    version="1.0.0",
    openapi_tags=[
        {"name": "Students", "description": "Create, read, update and delete students. Follow Steps 1 to 6 in order."},
        {"name": "Health", "description": "Check that the API is running."},
    ],
    swagger_ui_parameters={
        "tryItOutEnabled": True,  # fields are editable straight away, no "Try it out" click needed
        "defaultModelsExpandDepth": -1,  # hide the technical "Schemas" section at the bottom
    },
)

app.include_router(student_router)

STATIC_DIR = Path(__file__).resolve().parent / "static"
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")


@app.get("/", include_in_schema=False)
def dashboard():
    """Serve the Student Management dashboard (HTML/CSS/JS that calls the API above)."""
    return FileResponse(STATIC_DIR / "index.html")


@app.get("/health", tags=["Health"], summary="Check the API Is Running")
def health():
    return {"message": "FastAPI Student CRUD API is running"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
