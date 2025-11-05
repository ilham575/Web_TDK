# Web TDK Server - Backend API

## Setup Instructions

### 1. Prerequisites
- Python 3.13+
- Poetry (recommended) or pip
- MySQL database

### 2. Install Dependencies

#### Using Poetry (Recommended):
```bash
cd web_tdk_server
poetry install
```

#### Using pip:
```bash
cd web_tdk_server
pip install -r requirements.txt
```

### 3. Environment Configuration

Create a `.env` file in the `web_tdk_server` directory with:

```env
DATABASE_URL=mysql+pymysql://username:password@localhost/database_name
JWT_SECRET_KEY=your-secret-key-here
JWT_ALGORITHM=HS256
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=1440
```

### 4. Database Setup

The application will automatically create tables on first run. Make sure your MySQL database exists before starting.

### 5. Run the Server

#### Using Poetry:
```bash
poetry run uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

#### Using uvicorn directly:
```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

The server will be available at `http://localhost:8000`

## API Endpoints

### Schedule Management

#### Admin Endpoints:
- `POST /schedule/slots` - Create new time slot
- `GET /schedule/slots` - Get all time slots for school
- `PUT /schedule/slots/{slot_id}` - Update time slot
- `DELETE /schedule/slots/{slot_id}` - Delete time slot

#### Teacher Endpoints:
- `POST /schedule/assign` - Assign subject to time slot
- `GET /schedule/teacher` - Get teacher's schedule assignments
- `DELETE /schedule/assign/{assignment_id}` - Remove subject assignment

#### Student Endpoints:
- `GET /schedule/student` - Get student's class schedule

### Other Endpoints:
- `/users/*` - User management
- `/schools/*` - School management  
- `/subjects/*` - Subject management
- `/announcements/*` - Announcement management
- `/attendance/*` - Attendance management
- `/grades/*` - Grade management

## Features

### Schedule Management System:
1. **Admin Functions:**
   - Create time slots (day of week + time period)
   - Manage school-wide schedule availability
   - Edit/delete existing time slots

2. **Teacher Functions:**
   - Assign subjects to available time slots
   - View their teaching schedule
   - Remove subject assignments

3. **Student Functions:**
   - View complete weekly timetable
   - See all enrolled subjects with schedules
   - Mobile-responsive schedule display

## Database Models

### ScheduleSlot
- id, day_of_week, start_time, end_time
- school_id, created_by (admin)

### SubjectSchedule  
- id, subject_id, schedule_slot_id, teacher_id
- Links subjects to time slots with teacher assignment

## Development

- FastAPI framework with automatic OpenAPI documentation
- SQLAlchemy ORM for database operations
- Pydantic schemas for request/response validation
- JWT authentication and role-based access control
- CORS enabled for frontend integration