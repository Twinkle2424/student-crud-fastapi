# FastAPI – Student CRUD Application

A REST API built with **FastAPI** for managing university student records, organised in a **Models → Routes → Controllers** architecture, with a **visual Student Management dashboard** (HTML, CSS and JavaScript) that performs every CRUD operation through the API.

> **This project uses local in-memory storage and does not use any database.**

---

## 1. Project Description

The API supports creating, reading, updating and deleting students. Every request and response is checked with **Pydantic** models, and each endpoint returns the correct HTTP status code. Student records are kept in a Python dictionary for as long as the server runs. They are lost when the server restarts.

## 2. Assignment Objective

Build a simple REST API with FastAPI that:

- runs locally with Uvicorn
- stores data only in memory (no database)
- exposes exactly five CRUD APIs: Create, Read All, Read by ID, Update, Delete
- separates code into Models, Routes and Controllers
- uses the right HTTP methods and status codes
- validates input with Pydantic
- can be tested from the Swagger UI at `/docs`

## 3. Features

- **Student Management dashboard** at `/`: statistics, a student table, search, filters, pagination, and Add/View/Edit/Delete modals, all powered by the REST API
- The five required CRUD endpoints
- Student IDs generated automatically (1, 2, 3, …) and never reused
- Pydantic validation: required fields, a valid email, a non-empty name and course, and a semester from 1 to 12
- Unique emails (case-insensitive), with `400 Bad Request` for duplicates
- Clear `404 Not Found` messages, e.g. `Student with ID 999 not found`
- **Bonus:** search and filter by name, course and semester
- **Bonus:** pagination with `page` and `limit`
- **Bonus:** separate response models (`StudentResponse`, `StudentListResponse`, `ErrorResponse`)
- Swagger documentation with summaries, descriptions, examples and documented error responses

## 4. Technologies

| Technology | Purpose |
|------------|---------|
| Python 3.10+ | Programming language |
| FastAPI | Web framework |
| Uvicorn | ASGI server |
| Pydantic v2 | Data validation and serialisation |
| email-validator | Email validation for Pydantic's `EmailStr` |

## 5. Project Structure

```
student-crud-fastapi/
│
├── main.py                        # Creates the FastAPI app, includes the student router, serves the dashboard
│
├── models/
│   ├── __init__.py
│   └── student_model.py           # Pydantic request/response models and validation rules
│
├── routes/
│   ├── __init__.py
│   └── student_routes.py          # Endpoints, HTTP methods, status codes, calls to the controller
│
├── controllers/
│   ├── __init__.py
│   └── student_controller.py      # CRUD/business logic on the in-memory collection
│
├── static/                        # Frontend dashboard (no framework, no build step)
│   ├── index.html                 # Page layout: sidebar, statistics, table, modals
│   ├── css/style.css              # Styles and responsive layout
│   └── js/app.js                  # Calls the REST API with fetch() and renders the UI
│
├── requirements.txt
├── render.yaml                    # Render deployment blueprint
└── README.md
```

| Layer | Responsibility |
|-------|----------------|
| **Models** | Define the Pydantic models (`StudentCreate`, `StudentUpdate`, `Student`, `StudentResponse`, `StudentListResponse`, `ErrorResponse`) and their validation rules |
| **Controllers** | Hold the in-memory `students` dictionary and the create, read, update, delete, filter and paginate logic. Raise `StudentNotFoundError` or `DuplicateEmailError` when a request can't be completed |
| **Routes** | Define the endpoints, HTTP methods and request/response models. Call the controller and turn its errors into HTTP responses (`404`, `400`) |
| **main.py** | Creates the FastAPI app, includes the student router, and serves the dashboard (`/`) and its static files (`/static`) |
| **static/** | The dashboard frontend. It stores no data itself: every action is a `fetch()` call to the `/students` API |

## 6. Installation

```bash
git clone https://github.com/Harsh266/student-crud-fastapi.git
cd student-crud-fastapi

# optional: create a virtual environment
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # macOS / Linux

pip install -r requirements.txt
```

## 7. Running the Application

```bash
uvicorn main:app --reload
# or
python main.py
```

| Page | URL |
|------|-----|
| **Student Management dashboard** | http://127.0.0.1:8000/ |
| Swagger UI (API docs) | http://127.0.0.1:8000/docs |
| Health check | http://127.0.0.1:8000/health |

`GET /health` returns:

```json
{ "message": "FastAPI Student CRUD API is running" }
```

### Using the dashboard

| CRUD | In the dashboard | API call |
|------|------------------|----------|
| **Create** | **+ Add Student** → fill in the form → **Create Student** | `POST /students` |
| **Read** | The student table, and the **View** (eye) button for details | `GET /students`, `GET /students/{id}` |
| **Update** | **Edit** (pencil) → change fields → **Save Changes** | `GET /students/{id}` then `PUT /students/{id}` |
| **Delete** | **Delete** (trash) → confirm **Delete Student** | `DELETE /students/{id}` |

The search box, **Course** and **Semester** filters, and **Rows per page** / page buttons send the `name`, `course`, `semester`, `page` and `limit` query parameters to `GET /students`. Validation, duplicate-email, not-found and connection errors are shown as plain-language messages. The layout adapts to desktop, tablet and mobile.

### Deploying to Render

The repository includes a [`render.yaml`](render.yaml) blueprint, so Render can configure the service automatically:

1. Sign in at https://dashboard.render.com with GitHub.
2. Click **New → Blueprint**, pick the `student-crud-fastapi` repository, and click **Apply**.
3. Wait for the first deploy to finish (about 2–3 minutes), then open the service URL shown in Render: the dashboard is at `/`, Swagger at `/docs`.

| Setting | Value |
|---------|-------|
| Build command | `pip install -r requirements.txt` |
| Start command | `uvicorn main:app --host 0.0.0.0 --port $PORT` |
| Health check | `/health` |
| Python | 3.13.1 |
| Auto-deploy | On every push to `main` |

> **Note:** On Render's free plan the service sleeps after about 15 minutes without traffic; the next visit takes up to a minute to wake it. Because storage is in memory, **students are cleared whenever the service restarts, sleeps or redeploys**. This is expected for this assignment (no database).

## 8. Swagger Documentation

| UI | URL |
|----|-----|
| Swagger UI | http://127.0.0.1:8000/docs |
| ReDoc | http://127.0.0.1:8000/redoc |
| OpenAPI JSON | http://127.0.0.1:8000/openapi.json |

To try an endpoint in Swagger, open it, click **Try it out**, fill in the parameters or body, and click **Execute**.

## 9. Required APIs

| Operation | HTTP Verb | Endpoint | Success | Possible Errors |
|-----------|-----------|----------|---------|-----------------|
| Create Student | `POST` | `/students` | `201 Created` | `400`, `422` |
| Read All Students | `GET` | `/students` | `200 OK` | `422` |
| Read Student by ID | `GET` | `/students/{id}` | `200 OK` | `404`, `422` |
| Update Student | `PUT` | `/students/{id}` | `200 OK` | `400`, `404`, `422` |
| Delete Student | `DELETE` | `/students/{id}` | `204 No Content` | `404`, `422` |

## 10. Request Examples

**Create a student:** `POST /students`

```json
{
  "name": "Rahul Patel",
  "email": "rahul@example.com",
  "course": "B.Tech Computer Engineering",
  "semester": 5
}
```

**Update a student:** `PUT /students/1` (all fields are required; the ID in the URL is kept)

```json
{
  "name": "Rahul Patel",
  "email": "rahul@example.com",
  "course": "B.Tech Computer Engineering",
  "semester": 6
}
```

**Using curl:**

```bash
curl -X POST http://127.0.0.1:8000/students -H "Content-Type: application/json" \
     -d '{"name":"Rahul Patel","email":"rahul@example.com","course":"B.Tech Computer Engineering","semester":5}'
curl http://127.0.0.1:8000/students
curl http://127.0.0.1:8000/students/1
curl -X PUT http://127.0.0.1:8000/students/1 -H "Content-Type: application/json" \
     -d '{"name":"Rahul Patel","email":"rahul@example.com","course":"B.Tech Computer Engineering","semester":6}'
curl -X DELETE http://127.0.0.1:8000/students/1
```

## 11. Response Examples

**`201 Created`** from `POST /students`, and **`200 OK`** from `GET /students/1` or `PUT /students/1`:

```json
{
  "id": 1,
  "name": "Rahul Patel",
  "email": "rahul@example.com",
  "course": "B.Tech Computer Engineering",
  "semester": 5
}
```

**`200 OK`** from `GET /students`:

```json
{
  "page": 1,
  "limit": 10,
  "total": 2,
  "total_pages": 1,
  "students": [
    { "id": 1, "name": "Rahul Patel", "email": "rahul@example.com", "course": "B.Tech Computer Engineering", "semester": 5 },
    { "id": 2, "name": "Priya Shah", "email": "priya@example.com", "course": "B.Sc Information Technology", "semester": 6 }
  ]
}
```

**`204 No Content`** from `DELETE /students/1`: the response body is empty.

## 12. HTTP Status Codes

| Status Code | When it is returned |
|-------------|---------------------|
| `200 OK` | Successful `GET` or `PUT` |
| `201 Created` | Student created |
| `204 No Content` | Student deleted (empty body) |
| `400 Bad Request` | The email already belongs to another student |
| `404 Not Found` | No student has the requested ID |
| `422 Unprocessable Entity` | Validation failed: a missing field, invalid email, empty name or course, semester outside 1–12, a non-integer or non-positive ID, invalid query parameters, or malformed JSON |

## 13. Error Handling

**404: student not found**

```json
{ "detail": "Student with ID 999 not found" }
```

**400: duplicate email**

```json
{ "detail": "A student with email rahul@example.com already exists" }
```

**422: validation error** (returned automatically by FastAPI/Pydantic)

```json
{
  "detail": [
    {
      "type": "value_error",
      "loc": ["body", "email"],
      "msg": "value is not a valid email address: An email address must have an @-sign.",
      "input": "not-an-email"
    }
  ]
}
```

Validation rules:

| Field | Rule |
|-------|------|
| `name` | Required; 1–100 characters; can't be blank or whitespace only (surrounding whitespace is trimmed) |
| `email` | Required; must be a valid email address; unique across students |
| `course` | Required; 1–100 characters; can't be blank or whitespace only |
| `semester` | Required integer from 1 to 12 |
| `id` (path) | Integer greater than 0 |

## 14. Bonus: Search and Filter

`GET /students` takes optional query parameters. With no filters, it returns every student.

| Parameter | Match type | Example |
|-----------|------------|---------|
| `name` | Partial, case-insensitive | `GET /students?name=Rahul` |
| `course` | Partial, case-insensitive | `GET /students?course=BCA` |
| `semester` | Exact | `GET /students?semester=5` |

Filters can be combined, e.g. `GET /students?course=B.Tech&semester=7`.

## 15. Bonus: Pagination

| Parameter | Default | Rule |
|-----------|---------|------|
| `page` | `1` | Must be ≥ 1 |
| `limit` | `10` | Must be between 1 and 100 |

Examples:

```
GET /students?page=1&limit=2
GET /students?page=2&limit=2
GET /students?course=B.Tech&page=1&limit=5
```

A page past the last one returns `200 OK` with an empty `students` list. An invalid `page` or `limit` returns `422`. Filters are applied before pagination, so `total` counts only the matching students.

## 16. Response Models

| Model | Used for |
|-------|----------|
| `StudentCreate` | Request body for `POST /students` |
| `StudentUpdate` | Request body for `PUT /students/{id}` |
| `StudentResponse` | Single student in responses (`id`, `name`, `email`, `course`, `semester`) |
| `StudentListResponse` | Paginated list (`page`, `limit`, `total`, `total_pages`, `students`) |
| `ErrorResponse` | `400` and `404` error bodies (`detail`) |

All of these schemas appear in the Swagger UI under **Schemas**.

## 17. Testing Instructions

1. Start the server with `uvicorn main:app --reload` and open http://127.0.0.1:8000/docs.
2. Create at least five students with `POST /students`:

| # | Name | Email | Course | Semester |
|---|------|-------|--------|----------|
| 1 | Rahul Patel | rahul@example.com | B.Tech Computer Engineering | 5 |
| 2 | Priya Shah | priya@example.com | B.Sc Information Technology | 6 |
| 3 | Amit Desai | amit@example.com | BCA | 4 |
| 4 | Neha Mehta | neha@example.com | B.Tech Information Technology | 7 |
| 5 | Karan Joshi | karan@example.com | B.Sc Computer Science | 3 |

3. Work through the test checklist:

| # | Test Case | Expected Result |
|---|-----------|-----------------|
| 1 | Create a valid student | `201 Created` + created student |
| 2 | Create a student with invalid data (e.g. `"email": "abc"`, `"semester": 0`) | `422 Unprocessable Entity` |
| 3 | Get all students | `200 OK` + list of students |
| 4 | Get an existing student ID | `200 OK` + student |
| 5 | Get a non-existing student ID (e.g. `999`) | `404 Not Found` |
| 6 | Update an existing student | `200 OK` + updated student |
| 7 | Update a non-existing student ID | `404 Not Found` |
| 8 | Delete an existing student | `204 No Content` |
| 9 | Delete a non-existing student ID | `404 Not Found` |
| 10 | Get the deleted student | `404 Not Found` |
| 11 | Create a student with an email that already exists | `400 Bad Request` |
| 12 | `GET /students?name=Rahul` / `?course=BCA` / `?semester=5` | `200 OK` + matching students |
| 13 | `GET /students?page=2&limit=2` | `200 OK` + second page |
| 14 | `GET /students?page=0` or `?limit=0` | `422 Unprocessable Entity` |

> Data lives in memory, so restarting the server clears all students and starts IDs again at 1.

## 18. Database Restriction

**This project uses local in-memory storage and does not use any database.**

Students are stored in a Python dictionary in `controllers/student_controller.py`:

```python
students: dict[int, Student] = {}
```

The project uses no MongoDB, MySQL, PostgreSQL, SQLite, Firebase, Redis, SQLAlchemy, or any other database or persistent storage.

## 19. GitHub Project Information

| | |
|---|---|
| **Repository** | https://github.com/Harsh266/student-crud-fastapi |
| **Branch** | `main` |
| **Author** | Harsh Vekariya ([@Harsh266](https://github.com/Harsh266)) |
| **Course** | Principles of DevOps and Web API Development (Semester 7) |

### Development History

The project was built one step at a time, with each step tested, committed and pushed separately:

| # | Commit | Step |
|---|--------|------|
| 1 | `919518d` | Initial FastAPI project setup |
| 2 | `6da3941` | Add project dependencies |
| 3 | `844bf6f` | Add .gitignore |
| 4 | `6352353` | Add student Pydantic models |
| 5 | `5495dcf` | Add student CRUD controller logic |
| 6 | `746eade` | Add create student API |
| 7 | `0cc691c` | Add get all students API |
| 8 | `ee84711` | Add get student by ID API |
| 9 | `4e347b1` | Add update student API |
| 10 | `5c07044` | Add delete student API |
| 11 | `db1a29d` | Integrate student CRUD routes |
| 12 | `09ae48d` | Improve validation and error handling |
| 13 | `1cab15c` | Add student search and filtering |
| 14 | `784342d` | Add student pagination |
| 15 | `cdb32b8` | Add structured API response models |
| 16 | `7f23683` | Improve API documentation |
| 17 | `5ff6309` | Add project documentation |
| 18 | `5230aa8` | Update README |
| 19 | `04d5278` | Improve Swagger API documentation |
| 20 | — | Create professional student CRUD dashboard |

View the full history at https://github.com/Harsh266/student-crud-fastapi/commits/main
