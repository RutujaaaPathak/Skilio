# Skilio

### AI-Powered Intelligent Assessment & Academic Integrity Platform

Skilio is a next-generation examination and assessment platform designed to ensure secure, fair, and adaptive evaluations in the age of Artificial Intelligence.

Traditional online examination systems struggle to detect modern cheating methods such as AI-generated answers, second-device usage, and answer replication. Skilio addresses these challenges through AI-powered proctoring, behavioral analytics, adaptive testing, voice-based understanding verification, and real-time paper generation.

Rather than simply evaluating answers, Skilio focuses on assessing genuine understanding, skills, and academic integrity.

---

## Problem Statement

The rise of AI tools has transformed education, but it has also introduced new challenges in maintaining examination integrity.

Current examination platforms can detect tab switching and basic suspicious behavior, but they often fail to identify:

* AI-assisted cheating
* Second-device usage
* Memorized or copied responses
* Lack of conceptual understanding
* Question paper leaks

Skilio aims to solve these challenges through intelligent assessment and verification mechanisms.

---

## Key Features

### Offline-First Examination Engine

* Conduct examinations without continuous internet connectivity.
* Enables secure assessments even in low-connectivity environments.
* Reduces infrastructure requirements for institutions.

### AI-Powered Proctoring

* Webcam monitoring (BlazeFace face detection)
* Gaze estimation & head-pose tracking
* Phone / second-device detection
* Multiple person detection
* Voice & screen monitoring
* Suspicious behavior analysis
* Automated flag generation & violation scoring

### Second Device Detection

* Detects unauthorized devices present during examinations.
* Alerts invigilators about potential cheating attempts.

### AI-Assisted Cheating Detection

* Behavioral typing analysis
* Response pattern analysis
* Detection of unusually generated or copied answers

### Voice Understanding Verification

* Students verbally explain selected answers.
* AI evaluates conceptual understanding and consistency.

### Adaptive Assessment Engine

* Dynamically adjusts question difficulty based on performance.
* Provides a more accurate measure of student capability.

### Zero-Knowledge Question Paper Generation

* Generates unique yet equivalent question papers for every student.
* Eliminates risks associated with paper leaks.

### Intelligence Profile Generation

* Creates skill-based performance profiles.
* Provides insights beyond traditional marks and grades.

### Class Management System

* Teachers create classes with unique 6-character codes.
* Students join classes using the code.
* Assign exams to entire classes at once.
* Future members auto-receive assigned exams.

### Evaluation & Reports

* Teacher evaluation dashboard with submission queue.
* Per-question marking workspace with AI-suggested marks.
* Final review with analytics (score distribution, topic/difficulty/Bloom's analysis).
* Publish results workflow — students see results only after publishing.
* Comprehensive reports with CSV export.

### Syllabus Management

* Organize topics by subject, unit, and chapter.
* Mark topics as completed manually.
* Subject coverage heatmap with per-unit progress tracking.
* Learning outcomes management.

### Teacher Control Room

* Live examination monitoring dashboard.
* Real-time alerts and analytics.
* Centralized examination management.

---

## System Architecture

```text
Student Device
      │
      ▼
Offline Exam Engine
      │
      ├── AI Proctoring Module
      ├── Behavioral Analytics Module
      ├── Voice Verification Module
      ├── Adaptive Testing Engine
      └── Anti-Cheating Engine
      │
      ▼
Backend Services
      │
      ▼
Teacher Control Room & Analytics Dashboard
```

## Tech Stack

### Frontend

* React.js
* JavaScript (JSX)
* Tailwind CSS v4
* Vite

### Backend

* Python 3.12
* FastAPI
* SQLAlchemy ORM
* Pydantic v2

### Database

* SQLite (development) / PostgreSQL (production)

### AI & ML

* OpenAI / LLM integration (AI question generation, equivalent variants)
* AI-suggested evaluation marks with confidence scoring
* Behavioral analytics models
* BlazeFace face detection (TensorFlow.js)
* Gaze estimation algorithms
* Proctoring algorithms

### Deployment

* Docker
* Cloud Infrastructure

---

## Future Scope

* Multi-language examination support
* Advanced AI-generated answer detection
* Industry-ready skill certification profiles
* Interview readiness assessment
* Nationwide examination ecosystem
* Blockchain-based credential verification

---

## Vision

To build a secure, intelligent, and future-ready assessment ecosystem that evaluates true knowledge, protects academic integrity, and empowers institutions with meaningful learning insights.

---

## Team

Developed for an International Hackathon FARAWAY 2026 .
* Harsh gahankar (lead) -> Frontend and UI/IX developer
* Aanchal Jain -> Frontend Developer
* Shrey Ruparel -> AI/ML engineer 
* Rutuja Pathak -> Backend Developer
* Omkar Wayal -> Backend Developer and Deployment Expert

---

### "Verifying Knowledge, Not Just Answers."
