# My School Web Project (Tadika)
โปรเจคเว็บไซต์เพื่อใช้สำหรับศูนย์การเรียนรู้อิสลามประจำมัสยิด(ตาดีกา) 

## จุดประสงค์
เพื่อฝึกทักษะการเขียนเว็บของตัวเอง และการใช้ประโยชน์จาก AI ในการช่วยเขียนโค้ดตามแบบที่ผู้ทำต้องการ

## ทำโดย
Ilham Hajidoloh 

---

## Getting Started

This project contains both frontend (React) and backend (FastAPI) applications for a comprehensive school management system with complete schedule management functionality.

### ✨ New Features Added
- **Complete Schedule Management System**: Admin creates time slots, teachers assign subjects, students view timetables
- **Role-based Schedule Access**: Different interfaces for admin, teacher, and student roles  
- **Responsive Design**: Full mobile and tablet compatibility for schedule displays
- **Modern UI**: Glassmorphism design with smooth animations and transitions
- **📚 Centralized Subject Management**: Admin creates subjects with type classification (main/activity), assigns classrooms, automatic student enrollment

### 📚 Subject Management System (New)
- **Admin-Centralized**: Move from teacher-based to admin-managed subjects
- **Subject Types**: Classify subjects as หลัก (main) or กิจกรรม (activity)
- **Classroom Assignment**: Assign multiple classrooms to single subject
- **Auto-Enrollment**: Students automatically enrolled when classroom is assigned
- **Teacher Assignment**: Assign teachers to subjects at subject level

For detailed implementation, see: `SUBJECT_MANAGEMENT_SUMMARY.md` and `SUBJECT_MANAGEMENT_IMPLEMENTATION.md`

### Prerequisites
- Node.js 16+ and npm (for frontend)
- Python 3.13+ (for backend)
- MySQL database
- Git (for version control)

### Quick Setup

#### 1. Clone and Setup Backend
```bash
cd web_tdk_server

# Install dependencies
pip install -r requirements.txt

# Configure environment
copy .env.example .env
# Edit .env with your database credentials

# Run server (Windows)
run_server.bat
# OR run_server.ps1  
# OR manually: uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

#### 2. Setup Frontend
```bash
cd web_tdk_client

# Install dependencies
npm install

# Start development server
npm start
```

### 🌐 Application URLs
- **Frontend**: `http://localhost:3000`
- **Backend API**: `http://localhost:8000` 
- **API Documentation**: `http://localhost:8000/docs`

### 📋 Schedule Management Features

#### Admin Functions:
✅ Create time slots with day and time selection  
✅ Edit existing time slots  
✅ Delete time slots with confirmation  
✅ View all school schedule slots  
✅ Conflict detection for overlapping times

#### Teacher Functions:
✅ View available time slots created by admin  
✅ Assign personal subjects to time slots  
✅ View personal teaching schedule  
✅ Remove subject assignments  
✅ Modal-based assignment interface

#### Student Functions:
✅ View complete weekly timetable  
✅ See enrolled subjects with schedules  
✅ Responsive table format for mobile  
✅ Display teacher names and subject details

### 🛠️ Technical Stack
- **Frontend**: React 19.1.0, Modern CSS with Glassmorphism
- **Backend**: FastAPI, SQLAlchemy, JWT Authentication  
- **Database**: MySQL with automated table creation
- **Styling**: Responsive CSS Grid, CSS Variables, Modern Animations

### 🎨 Design Features
- **Glassmorphism UI**: Modern transparent design with backdrop blur
- **Full-Screen Layout**: Optimized viewport usage across all pages
- **Mobile-First**: Responsive design for all screen sizes
- **Smooth Animations**: CSS transitions and keyframe animations
- **Color Scheme**: Professional blue/green gradients with high contrast

### 🔧 Development Notes
- All schedule endpoints implemented with role-based access control
- JWT authentication with automatic token refresh
- Form validation and error handling
- Loading states and empty data scenarios
- Confirmation dialogs for destructive actions 
