# Mobile API Documentation

**Version:** 1.0.0
**Base URL:** `https://atom-q-beta-v12-demo-gani.vercel.app/api/mobile`

---

## Table of Contents

1. [Authentication](#authentication)
2. [Quiz Management](#quiz-management)
3. [Profile Management](#profile-management)
4. [Error Handling](#error-handling)
5. [Integration Guide](#integration-guide)

---

## Authentication

### Overview

The mobile API uses JWT (JSON Web Token) based authentication. Users must first login to obtain a JWT token, which is then included in the Authorization header for all subsequent API requests.

**Token Format:**
```
Authorization: Bearer <jwt_token>
```

**Token Expiry:** 60 days

---

### 1.1 Login

**Endpoint:** `POST /api/mobile/auth/login`

**Description:** Authenticates a user with their email and password credentials. Upon successful authentication, the API returns a JWT token and user profile information.

**Use Cases:**
- Initial user login
- Re-authentication after token expiry
- User authentication on mobile app startup

**Request:**

**HTTP Method:** `POST`
**Content-Type:** `application/json`

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "userpassword123"
}
```

**Field Descriptions:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| email | string | Yes | User's registered email address |
| password | string | Yes | User's password (minimum 6 characters) |

**Success Response:**

**HTTP Status Code:** `200 OK`

```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImNsN3h4eHh4eHh4eHh4eHh4eCIsImVtYWlsIjoidXNlckBleGFtcGxlLmNvbSIsInJvbGUiOiJVU0VSIiwiaWF0IjoxNzA1MzIzODAwLCJleHAiOjE3MDU0MTAyMDB9.exampleSignature",
    "user": {
      "id": "cl7xxxxxxxxxxxxxxxxxx",
      "email": "user@example.com",
      "name": "John Doe",
      "uoid": "",
      "phone": "+1234567890",
      "avatar": "https://example.com/avatar.jpg",
      "role": "USER",
      "isActive": true,
      "section": "A",
      "departmentId": "cl7xxxxxxxxxxxxx",
      "batchId": "cl7xxxxxxxxxxxxx",
      "campusId": "cl7xxxxxxxxxxxxx"
    }
  }
}
```

**Response Data Fields:**
| Field | Type | Description |
|-------|------|-------------|
| success | boolean | Indicates if the request was successful |
| message | string | Human-readable success message |
| data.token | string | JWT token for subsequent API calls (valid for 60 days) |
| data.user.id | string | Unique user identifier (CUID) |
| data.user.email | string | User's email address |
| data.user.name | string | User's full name |
| data.user.uoid | string | University/organization ID |
| data.user.phone | string | User's phone number |
| data.user.avatar | string | URL to user's profile picture |
| data.user.role | string | User's role (USER or ADMIN) |
| data.user.isActive | boolean | Whether the account is active |
| data.user.section | string | Student section (A, B, C, D, E, F) |
| data.user.departmentId | string | ID of user's department |
| data.user.batchId | string | ID of user's batch/year |
| data.user.campusId | string | ID of user's campus |

**Error Responses:**

**400 Bad Request**
```json
{
  "success": false,
  "message": "Email and password are required"
}
```

**401 Unauthorized - Invalid Credentials**
```json
{
  "success": false,
  "message": "Invalid email or password"
}
```

**403 Forbidden - Account Disabled**
```json
{
  "success": false,
  "message": "Your account has been disabled"
}
```

**500 Internal Server Error**
```json
{
  "success": false,
  "message": "Internal server error"
}
```

**Integration Tips:**
1. Store the JWT token securely on the device (Keychain for iOS, Keystore for Android)
2. Implement automatic retry logic with token refresh when expired
3. Cache user data locally for offline display
4. Use biometric authentication for faster subsequent logins

---

## Quiz Management

### Overview

The Quiz Management APIs allow mobile users to:
- View all quizzes assigned to them
- Start taking a quiz (creates attempt)
- View quiz questions
- Submit quiz answers
- Track their quiz attempts and progress

---

### 2.1 Get Quiz List

**Endpoint:** `GET /api/mobile/quiz`

**Description:** Retrieves a list of all quizzes assigned to the authenticated user. Each quiz includes detailed information about attempts, scores, time constraints, and availability status.

**Use Cases:**
- Display available quizzes on the dashboard
- Show quiz completion status
- Check if user can attempt a quiz
- Display quiz statistics and best scores

**Request:**

**HTTP Method:** `GET`

**Headers:**
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Query Parameters:** None

**Success Response:**

**HTTP Status Code:** `200 OK`

```json
{
  "success": true,
  "data": [
    {
      "id": "cl7xxxxxxxxxxxxxxxxxx",
      "title": "AWS Fundamentals Quiz",
      "description": "Test your knowledge of Amazon Web Services core services and concepts",
      "timeLimit": 30,
      "difficulty": "MEDIUM",
      "maxAttempts": 3,
      "startTime": "2024-01-01T10:00:00.000Z",
      "endTime": "2024-12-31T23:59:59.000Z",
      "questionCount": 10,
      "attempts": 2,
      "bestScore": 85.5,
      "lastAttemptDate": "2024-01-15T14:30:00.000Z",
      "canAttempt": true,
      "attemptStatus": "completed",
      "hasInProgress": false,
      "inProgressAttemptId": null
    },
    {
      "id": "cl7xxxxxxxxxxxxxxxxxx",
      "title": "Advanced JavaScript Quiz",
      "description": "Test your JavaScript advanced concepts and ES6+ features",
      "timeLimit": 45,
      "difficulty": "HARD",
      "maxAttempts": 1,
      "startTime": "2024-01-01T08:00:00.000Z",
      "endTime": "2024-01-31T18:00:00.000Z",
      "questionCount": 15,
      "attempts": 0,
      "bestScore": null,
      "lastAttemptDate": null,
      "canAttempt": true,
      "attemptStatus": "not_started",
      "hasInProgress": false,
      "inProgressAttemptId": null
    },
    {
      "id": "cl7xxxxxxxxxxxxxxxxxx",
      "title": "React Basics",
      "description": "Introduction to React fundamentals",
      "timeLimit": 20,
      "difficulty": "EASY",
      "maxAttempts": 5,
      "startTime": "2024-02-01T00:00:00.000Z",
      "endTime": "2024-02-28T23:59:59.000Z",
      "questionCount": 8,
      "attempts": 1,
      "bestScore": 92.0,
      "lastAttemptDate": "2024-01-20T10:15:00.000Z",
      "canAttempt": false,
      "attemptStatus": "expired",
      "hasInProgress": false,
      "inProgressAttemptId": null
    },
    {
      "id": "cl7xxxxxxxxxxxxxxxxxx",
      "title": "Python Programming",
      "description": "Python fundamentals and data structures",
      "timeLimit": 35,
      "difficulty": "MEDIUM",
      "maxAttempts": 2,
      "startTime": "2024-01-01T00:00:00.000Z",
      "endTime": "2024-03-31T23:59:59.000Z",
      "questionCount": 12,
      "attempts": 0,
      "bestScore": null,
      "lastAttemptDate": null,
      "canAttempt": false,
      "attemptStatus": "not_started_yet",
      "hasInProgress": false,
      "inProgressAttemptId": null
    },
    {
      "id": "cl7xxxxxxxxxxxxxxxxxx",
      "title": "Data Structures Quiz",
      "description": "Arrays, Linked Lists, Trees, and Graphs",
      "timeLimit": 40,
      "difficulty": "HARD",
      "maxAttempts": 3,
      "startTime": "2024-01-01T00:00:00.000Z",
      "endTime": "2024-04-30T23:59:59.000Z",
      "questionCount": 20,
      "attempts": 0,
      "bestScore": null,
      "lastAttemptDate": null,
      "canAttempt": true,
      "attemptStatus": "in_progress",
      "hasInProgress": true,
      "inProgressAttemptId": "cl7xxxxxxxxxxxxxxxxxx"
    }
  ]
}
```

**Response Data Fields:**

| Field | Type | Description |
|-------|------|-------------|
| data[].id | string | Unique quiz identifier |
| data[].title | string | Quiz title |
| data[].description | string | Quiz description/overview |
| data[].timeLimit | number | Time limit in minutes (null if unlimited) |
| data[].difficulty | string | Difficulty level: EASY, MEDIUM, HARD |
| data[].maxAttempts | number | Maximum allowed attempts (null if unlimited) |
| data[].startTime | string | ISO 8601 datetime when quiz becomes available |
| data[].endTime | string | ISO 8601 datetime when quiz expires |
| data[].questionCount | number | Total number of questions in quiz |
| data[].attempts | number | Number of completed attempts by user |
| data[].bestScore | number | Best score achieved (null if no attempts) |
| data[].lastAttemptDate | string | ISO 8601 datetime of last attempt (null if none) |
| data[].canAttempt | boolean | Whether user can start/resume the quiz |
| data[].attemptStatus | string | Current status of quiz |
| data[].hasInProgress | boolean | Whether user has an in-progress attempt |
| data[].inProgressAttemptId | string | ID of in-progress attempt (if exists) |

**Attempt Status Values:**

| Status | Description | UI Behavior |
|--------|-------------|-------------|
| `not_started` | User hasn't attempted the quiz yet | Show "Start Quiz" button |
| `in_progress` | User has an active attempt | Show "Continue Quiz" button, link to attemptId |
| `completed` | User has completed the quiz | Show score, "Retake" button if canAttempt is true |
| `not_started_yet` | Quiz hasn't started (startTime > now) | Show countdown, disable start button |
| `expired` | Quiz has ended (endTime < now) | Show "Closed" status, disable start button |

**Error Responses:**

**401 Unauthorized**
```json
{
  "success": false,
  "message": "Unauthorized"
}
```

**401 Unauthorized - Invalid Token**
```json
{
  "success": false,
  "message": "Invalid or expired token"
}
```

**500 Internal Server Error**
```json
{
  "success": false,
  "message": "Internal server error"
}
```

**Integration Tips:**
1. Implement pull-to-refresh to update quiz list
2. Show visual indicators for different attempt statuses
3. Display countdown timer for quizzes with future start times
4. Cache quiz list locally for offline viewing
5. Sort quizzes by priority (in-progress, available, completed, expired)

---

### 2.2 Take Quiz (Get Quiz Data)

**Endpoint:** `GET /api/mobile/quiz/:id`

**Description:** Retrieves quiz questions and related data for taking a quiz. If the user doesn't have an active attempt, this endpoint automatically creates a new attempt. If an attempt exists, it returns the current progress including saved answers.

**Use Cases:**
- User starts a new quiz
- User resumes an in-progress quiz
- Refresh quiz data while taking quiz
- Get time remaining calculation

**Request:**

**HTTP Method:** `GET`

**Headers:**
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Path Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| id | string | Yes | Quiz ID (CUID format) |

**Success Response:**

**HTTP Status Code:** `200 OK`

```json
{
  "success": true,
  "data": {
    "attemptId": "cl7xxxxxxxxxxxxxxxxxx",
    "quiz": {
      "id": "cl7xxxxxxxxxxxxxxxxxx",
      "title": "AWS Fundamentals Quiz",
      "description": "Test your knowledge of Amazon Web Services core services and concepts",
      "timeLimit": 30,
      "showAnswers": false,
      "checkAnswerEnabled": false,
      "negativeMarking": false,
      "negativePoints": null,
      "questions": [
        {
          "id": "cl7xxxxxxxxxxxxxxxxxx",
          "title": "Amazon S3 Storage Classes",
          "content": "Which Amazon S3 storage class is designed for data that is rarely accessed, with retrieval times ranging from minutes to hours?",
          "type": "MULTIPLE_CHOICE",
          "options": [
            {
              "id": "A",
              "text": "S3 Standard"
            },
            {
              "id": "B",
              "text": "S3 Standard-IA"
            },
            {
              "id": "C",
              "text": "S3 Glacier"
            },
            {
              "id": "D",
              "text": "S3 One Zone-IA"
            }
          ],
          "explanation": "Amazon S3 Glacier is designed for data archiving with long retrieval times, providing the lowest storage cost.",
          "difficulty": "EASY",
          "order": 1,
          "points": 1
        },
        {
          "id": "cl7xxxxxxxxxxxxxxxxxx",
          "title": "AWS Lambda Triggers",
          "content": "Select all the AWS services that can trigger an AWS Lambda function:",
          "type": "MULTI_SELECT",
          "options": [
            {
              "id": "A",
              "text": "Amazon S3"
            },
            {
              "id": "B",
              "text": "Amazon DynamoDB"
            },
            {
              "id": "C",
              "text": "Amazon EC2"
            },
            {
              "id": "D",
              "text": "Amazon Kinesis"
            },
            {
              "id": "E",
              "text": "Amazon SNS"
            }
          ],
          "explanation": "AWS Lambda can be triggered by S3, DynamoDB, Kinesis, SNS, API Gateway, CloudWatch Events, and more.",
          "difficulty": "MEDIUM",
          "order": 2,
          "points": 2
        },
        {
          "id": "cl7xxxxxxxxxxxxxxxxxx",
          "title": "EC2 Instance Types",
          "content": "EC2 instances in the T family (t2.micro, t3.small, etc.) are designed for workloads that:",
          "type": "TRUE_FALSE",
          "options": [
            {
              "id": "A",
              "text": "True"
            },
            {
              "id": "B",
              "text": "False"
            }
          ],
          "explanation": "T family instances are burstable performance instances suitable for workloads with moderate CPU usage.",
          "difficulty": "MEDIUM",
          "order": 3,
          "points": 1
        },
        {
          "id": "cl7xxxxxxxxxxxxxxxxxx",
          "title": "VPC Subnets",
          "content": "Complete the sentence: A VPC subnet is a range of IP addresses in your VPC. You can launch AWS resources, such as ______, into a specified subnet.",
          "type": "FILL_IN_BLANK",
          "options": [],
          "explanation": "You can launch EC2 instances, RDS database instances, and other AWS resources into a subnet.",
          "difficulty": "EASY",
          "order": 4,
          "points": 1
        },
        {
          "id": "cl7xxxxxxxxxxxxxxxxxx",
          "title": "RDS Backup",
          "content": "Amazon RDS automated backups are stored for how many days by default?",
          "type": "MULTIPLE_CHOICE",
          "options": [
            {
              "id": "A",
              "text": "1 day"
            },
            {
              "id": "B",
              "text": "7 days"
            },
            {
              "id": "C",
              "text": "30 days"
            },
            {
              "id": "D",
              "text": "90 days"
            }
          ],
          "explanation": "RDS creates automated backups during the backup window. The default backup retention period is 7 days.",
          "difficulty": "MEDIUM",
          "order": 5,
          "points": 1
        }
      ]
    },
    "timeRemaining": 1800,
    "startedAt": "2024-01-15T14:00:00.000Z",
    "answers": {
      "cl7xxxxxxxxxxxxxxxxxx": "C",
      "cl7xxxxxxxxxxxxxxxxxx": "[\"A\",\"B\",\"D\"]"
    }
  }
}
```

**Response Data Fields:**

| Field | Type | Description |
|-------|------|-------------|
| data.attemptId | string | Unique attempt identifier (use for saving/submitting) |
| data.quiz.id | string | Quiz ID |
| data.quiz.title | string | Quiz title |
| data.quiz.description | string | Quiz description |
| data.quiz.timeLimit | number | Time limit in minutes (null if unlimited) |
| data.quiz.showAnswers | boolean | Whether to show answers after submission |
| data.quiz.checkAnswerEnabled | boolean | Whether real-time answer checking is enabled |
| data.quiz.negativeMarking | boolean | Whether negative marking is applied |
| data.quiz.negativePoints | number | Points deducted for wrong answers (if negative marking) |
| data.quiz.questions[] | array | Array of question objects |
| data.timeRemaining | number | Time remaining in seconds |
| data.startedAt | string | ISO 8601 datetime when attempt was started |
| data.answers | object | Map of questionId -> userAnswer (for saved progress) |

**Question Object Fields:**

| Field | Type | Description |
|-------|------|-------------|
| questions[].id | string | Unique question identifier |
| questions[].title | string | Question title/heading |
| questions[].content | string | Question text/body |
| questions[].type | string | Question type (MULTIPLE_CHOICE, MULTI_SELECT, TRUE_FALSE, FILL_IN_BLANK) |
| questions[].options[] | array | Array of option objects |
| questions[].explanation | string | Answer explanation (shown after submission) |
| questions[].difficulty | string | Difficulty level (EASY, MEDIUM, HARD) |
| questions[].order | number | Display order of the question |
| questions[].points | number | Points for correct answer |

**Option Object Fields:**

| Field | Type | Description |
|-------|------|-------------|
| options[].id | string | Option identifier (A, B, C, D, etc.) |
| options[].text | string | Option text content |

**Question Types:**

| Type | Description | Answer Format |
|------|-------------|---------------|
| `MULTIPLE_CHOICE` | Single correct answer | String (e.g., "C") |
| `MULTI_SELECT` | Multiple correct answers | JSON string or Array (e.g., "[\"A\",\"B\",\"D\"]") |
| `TRUE_FALSE` | True or False | String (e.g., "A" for True, "B" for False) |
| `FILL_IN_BLANK` | Text input | String (e.g., "EC2 instances") |

**Error Responses:**

**401 Unauthorized**
```json
{
  "success": false,
  "message": "Unauthorized"
}
```

**400 Bad Request - Quiz Not Active**
```json
{
  "success": false,
  "message": "Quiz is not active"
}
```

**400 Bad Request - Not Started Yet**
```json
{
  "success": false,
  "message": "Quiz has not started yet"
}
```

**400 Bad Request - Quiz Expired**
```json
{
  "success": false,
  "message": "Quiz has expired"
}
```

**403 Forbidden - No Access**
```json
{
  "success": false,
  "message": "You don't have access to this quiz"
}
```

**400 Bad Request - Max Attempts Reached**
```json
{
  "success": false,
  "message": "Maximum attempts reached"
}
```

**404 Not Found**
```json
{
  "success": false,
  "message": "Quiz not found"
}
```

**500 Internal Server Error**
```json
{
  "success": false,
  "message": "Internal server error"
}
```

**Integration Tips:**
1. Save the `attemptId` when quiz starts - needed for submission
2. Display a countdown timer based on `timeRemaining` (in seconds)
3. Periodically refresh (every 30 seconds) to sync time remaining and saved answers
4. Cache quiz questions locally for offline access
5. Auto-save answers every few minutes to prevent data loss
6. Handle quiz timer expiry gracefully (auto-submit or warning)
7. Show different UI components based on question type

---

### 2.3 Submit Quiz

**Endpoint:** `POST /api/mobile/quiz/:id/submit`

**Description:** Submits the user's quiz answers for grading. The API calculates scores based on correct answers, applies negative marking if configured, and returns the final results. This action completes the quiz attempt.

**Use Cases:**
- User finishes taking quiz and submits answers
- Auto-submit when timer expires
- Force-submit after reaching time limit

**Request:**

**HTTP Method:** `POST`

**Headers:**
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Path Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| id | string | Yes | Quiz ID (CUID format) |

**Request Body:**
```json
{
  "attemptId": "cl7xxxxxxxxxxxxxxxxxx",
  "answers": {
    "cl7xxxxxxxxxxxxxxxxxx": "C",
    "cl7xxxxxxxxxxxxxxxxxx": "[\"A\",\"B\",\"D\"]",
    "cl7xxxxxxxxxxxxxxxxxx": "A",
    "cl7xxxxxxxxxxxxxxxxxx": "EC2 instances",
    "cl7xxxxxxxxxxxxxxxxxx": "B"
  }
}
```

**Request Body Fields:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| attemptId | string | Yes | The attempt ID received from GET /quiz/:id |
| answers | object | Yes | Map of questionId -> userAnswer |

**Answer Format by Question Type:**

| Question Type | Format | Example |
|--------------|---------|---------|
| `MULTIPLE_CHOICE` | String with option ID | `"C"` |
| `MULTI_SELECT` | JSON string or Array of option IDs | `"[\"A\",\"B\",\"D\"]"` or `["A","B","D"]` |
| `TRUE_FALSE` | String with option ID | `"A"` (for True) or `"B"` (for False) |
| `FILL_IN_BLANK` | String with user's answer | `"EC2 instances"` |

**Note:** Questions that user didn't attempt can be omitted from the answers object or sent with empty string.

**Success Response:**

**HTTP Status Code:** `200 OK`

```json
{
  "success": true,
  "message": "Quiz submitted successfully",
  "data": {
    "attemptId": "cl7xxxxxxxxxxxxxxxxxx",
    "score": 85.71,
    "totalPoints": 7,
    "timeTaken": 1250,
    "submittedAt": "2024-01-15T14:20:50.000Z",
    "quiz": {
      "id": "cl7xxxxxxxxxxxxxxxxxx",
      "title": "AWS Fundamentals Quiz"
    }
  }
}
```

**Response Data Fields:**

| Field | Type | Description |
|-------|------|-------------|
| data.attemptId | string | Unique attempt identifier |
| data.score | number | Final score as a percentage (0-100) |
| data.totalPoints | number | Total possible points in the quiz |
| data.timeTaken | number | Time taken to complete quiz in seconds |
| data.submittedAt | string | ISO 8601 datetime of submission |
| data.quiz.id | string | Quiz ID |
| data.quiz.title | string | Quiz title |

**Scoring Logic:**

1. **Correct Answer:**
   - Award full points for the question
   - Example: If question is worth 2 points, user gets 2 points

2. **Wrong Answer:**
   - Without negative marking: Award 0 points
   - With negative marking: Deduct `negativePoints` from score
   - Example: If `negativePoints` is 0.5, user loses 0.5 points

3. **Final Score Calculation:**
   ```
   score = (totalPointsEarned / totalPossiblePoints) * 100
   ```

4. **Question Type Scoring:**
   - `MULTIPLE_CHOICE`: Exact match required
   - `MULTI_SELECT`: All correct options must be selected, order doesn't matter
   - `TRUE_FALSE`: Exact match required
   - `FILL_IN_BLANK`: Case-insensitive match, leading/trailing spaces ignored

**Error Responses:**

**401 Unauthorized**
```json
{
  "success": false,
  "message": "Unauthorized"
}
```

**400 Bad Request - Missing Attempt ID**
```json
{
  "success": false,
  "message": "Attempt ID is required"
}
```

**404 Not Found - Attempt Not Found**
```json
{
  "success": false,
  "message": "Attempt not found"
}
```

**403 Forbidden - Wrong User**
```json
{
  "success": false,
  "message": "Unauthorized"
}
```

**400 Bad Request - Already Submitted**
```json
{
  "success": false,
  "message": "Quiz has already been submitted"
}
```

**500 Internal Server Error**
```json
{
  "success": false,
  "message": "Internal server error"
}
```

**Integration Tips:**
1. Show a confirmation dialog before submitting
2. Display which questions are unanswered
3. Warn if user is submitting early
4. Show loading state while submitting
5. Display detailed results after submission (score, time taken)
6. Implement auto-submit when timer reaches 0
7. Store submission result locally for offline viewing
8. Provide option to review answers if quiz allows

---

## Profile Management

### Overview

The Profile Management APIs allow users to:
- View their profile information
- View quiz statistics and achievements
- Update their profile details
- Track recent activity

---

### 3.1 View Profile

**Endpoint:** `GET /api/mobile/profile`

**Description:** Retrieves the authenticated user's complete profile including personal information, statistics, and recent quiz activity. This endpoint provides all data needed to populate a user profile screen.

**Use Cases:**
- Display user profile screen
- Show quiz statistics and achievements
- Display recent activity feed
- Refresh user data

**Request:**

**HTTP Method:** `GET`

**Headers:**
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Query Parameters:** None

**Success Response:**

**HTTP Status Code:** `200 OK`

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "cl7xxxxxxxxxxxxxxxxxx",
      "email": "john.doe@example.com",
      "name": "John Doe",
      "uoid": "STU-2024-001",
      "phone": "+1 (555) 123-4567",
      "avatar": "https://cdn.example.com/avatars/john-doe.jpg",
      "role": "USER",
      "section": "A",
      "createdAt": "2024-01-10T08:30:00.000Z",
      "department": {
        "id": "cl7xxxxxxxxxxxxx",
        "name": "Computer Science & Engineering"
      },
      "batch": {
        "id": "cl7xxxxxxxxxxxxx",
        "name": "2022-2026"
      },
      "campus": {
        "id": "cl7xxxxxxxxxxxxx",
        "name": "Massachusetts Institute of Technology",
        "shortName": "MIT"
      }
    },
    "stats": {
      "totalQuizAttempts": 15,
      "completedQuizzes": 12,
      "bestScore": 96.5
    },
    "recentActivity": [
      {
        "id": "cl7xxxxxxxxxxxxxxxxxx",
        "quizId": "cl7xxxxxxxxxxxxxxxxxx",
        "quizTitle": "AWS Fundamentals Quiz",
        "score": 85.71,
        "submittedAt": "2024-01-15T14:20:50.000Z"
      },
      {
        "id": "cl7xxxxxxxxxxxxxxxxxx",
        "quizId": "cl7xxxxxxxxxxxxxxxxxx",
        "quizTitle": "Advanced JavaScript Quiz",
        "score": 78.0,
        "submittedAt": "2024-01-14T16:45:30.000Z"
      },
      {
        "id": "cl7xxxxxxxxxxxxxxxxxx",
        "quizId": "cl7xxxxxxxxxxxxxxxxxx",
        "quizTitle": "React Basics",
        "score": 92.0,
        "submittedAt": "2024-01-13T10:30:15.000Z"
      },
      {
        "id": "cl7xxxxxxxxxxxxxxxxxx",
        "quizId": "cl7xxxxxxxxxxxxxxxxxx",
        "quizTitle": "Python Programming",
        "score": 88.5,
        "submittedAt": "2024-01-12T14:15:45.000Z"
      },
      {
        "id": "cl7xxxxxxxxxxxxxxxxxx",
        "quizId": "cl7xxxxxxxxxxxxxxxxxx",
        "quizTitle": "Data Structures Quiz",
        "score": 76.0,
        "submittedAt": "2024-01-11T09:20:00.000Z"
      }
    ]
  }
}
```

**Response Data Fields:**

**User Object:**

| Field | Type | Description |
|-------|------|-------------|
| data.user.id | string | Unique user identifier (CUID) |
| data.user.email | string | User's email address |
| data.user.name | string | User's full name |
| data.user.uoid | string | University/organization ID |
| data.user.phone | string | User's phone number |
| data.user.avatar | string | URL to user's profile picture |
| data.user.role | string | User's role (USER or ADMIN) |
| data.user.section | string | Student section (A, B, C, D, E, F) |
| data.user.createdAt | string | ISO 8601 datetime when account was created |
| data.user.department | object | Department information |
| data.user.batch | object | Batch/year information |
| data.user.campus | object | Campus/institution information |

**Department Object:**

| Field | Type | Description |
|-------|------|-------------|
| id | string | Department ID |
| name | string | Department name |

**Batch Object:**

| Field | Type | Description |
|-------|------|-------------|
| id | string | Batch ID |
| name | string | Batch/year (e.g., "2022-2026") |

**Campus Object:**

| Field | Type | Description |
|-------|------|-------------|
| id | string | Campus ID |
| name | string | Campus full name |
| shortName | string | Campus abbreviation |

**Stats Object:**

| Field | Type | Description |
|-------|------|-------------|
| data.stats.totalQuizAttempts | number | Total number of quiz attempts (including in-progress) |
| data.stats.completedQuizzes | number | Number of quizzes successfully completed |
| data.stats.bestScore | number | Highest score achieved across all quizzes (0-100) |

**Recent Activity Array:**

| Field | Type | Description |
|-------|------|-------------|
| data.recentActivity[].id | string | Attempt ID |
| data.recentActivity[].quizId | string | Quiz ID |
| data.recentActivity[].quizTitle | string | Quiz title |
| data.recentActivity[].score | number | Score achieved (0-100) |
| data.recentActivity[].submittedAt | string | ISO 8601 datetime of submission |

**Error Responses:**

**401 Unauthorized**
```json
{
  "success": false,
  "message": "Unauthorized"
}
```

**401 Unauthorized - Invalid Token**
```json
{
  "success": false,
  "message": "Invalid or expired token"
}
```

**404 Not Found**
```json
{
  "success": false,
  "message": "User not found"
}
```

**500 Internal Server Error**
```json
{
  "success": false,
  "message": "Internal server error"
}
```

**Integration Tips:**
1. Display user avatar using the provided URL
2. Show statistics in a visually appealing dashboard
3. Implement pull-to-refresh for profile updates
4. Cache profile data locally for offline display
5. Show achievement badges based on stats
6. Create visual trends from recent activity
7. Allow users to tap on recent activity to view quiz details
8. Implement lazy loading for large activity lists

**UI Suggestions:**

```
┌─────────────────────────────────────┐
│  [Avatar]  John Doe               │
│            john.doe@example.com     │
│  UOID: STU-2024-001              │
│  Section: A                      │
├─────────────────────────────────────┤
│  📊 Statistics                   │
│  ┌─────┬─────┬─────┬─────────┐ │
│  │15   │12   │96.5 │Completed│ │
│  │Total│Done │Best │Quizzes  │ │
│  └─────┴─────┴─────┴─────────┘ │
├─────────────────────────────────────┤
│  📝 Recent Activity              │
│  • AWS Fundamentals - 85.7%       │
│    2 hours ago                   │
│  • Advanced JavaScript - 78.0%    │
│    Yesterday                     │
│  • React Basics - 92.0%          │
│    2 days ago                    │
│  ...                            │
└─────────────────────────────────────┘
```

---

### 3.2 Edit Profile

**Endpoint:** `PUT /api/mobile/profile`

**Description:** Updates the authenticated user's profile information. Only provided fields are updated, allowing partial updates. This endpoint is designed for allowing users to modify their personal information.

**Use Cases:**
- Update user name
- Change phone number
- Update profile picture URL
- Multiple field updates in a single request

**Request:**

**HTTP Method:** `PUT`

**Headers:**
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Request Body Examples:**

**Example 1: Update Name Only**
```json
{
  "name": "Johnathan Doe"
}
```

**Example 2: Update Phone Number Only**
```json
{
  "phone": "+1 (555) 987-6543"
}
```

**Example 3: Update Avatar Only**
```json
{
  "avatar": "https://cdn.example.com/avatars/john-doe-v2.jpg"
}
```

**Example 4: Update Multiple Fields**
```json
{
  "name": "Johnathan Doe",
  "phone": "+1 (555) 987-6543",
  "avatar": "https://cdn.example.com/avatars/john-doe-v2.jpg"
}
```

**Request Body Fields:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| name | string | No | Updated full name (minimum 1 character) |
| phone | string | No | Updated phone number |
| avatar | string | No | URL to new profile picture |

**Note:** All fields are optional. Include only the fields you want to update. Omitted fields will remain unchanged.

**Success Response:**

**HTTP Status Code:** `200 OK`

```json
{
  "success": true,
  "message": "Profile updated successfully",
  "data": {
    "id": "cl7xxxxxxxxxxxxxxxxxx",
    "email": "john.doe@example.com",
    "name": "Johnathan Doe",
    "uoid": "STU-2024-001",
    "phone": "+1 (555) 987-6543",
    "avatar": "https://cdn.example.com/avatars/john-doe-v2.jpg",
    "role": "USER",
    "section": "A",
    "createdAt": "2024-01-10T08:30:00.000Z",
    "department": {
      "id": "cl7xxxxxxxxxxxxx",
      "name": "Computer Science & Engineering"
    },
    "batch": {
      "id": "cl7xxxxxxxxxxxxx",
      "name": "2022-2026"
    },
    "campus": {
      "id": "cl7xxxxxxxxxxxxx",
      "name": "Massachusetts Institute of Technology",
      "shortName": "MIT"
    }
  }
}
```

**Response Data Fields:**

Same as View Profile response (complete user object with updated values).

**Error Responses:**

**401 Unauthorized**
```json
{
  "success": false,
  "message": "Unauthorized"
}
```

**401 Unauthorized - Invalid Token**
```json
{
  "success": false,
  "message": "Invalid or expired token"
}
```

**400 Bad Request - No Valid Fields**
```json
{
  "success": false,
  "message": "No valid fields to update"
}
```

**500 Internal Server Error**
```json
{
  "success": false,
  "message": "Internal server error"
}
```

**Integration Tips:**
1. Validate input before sending (name length, phone format, URL validity)
2. Implement optimistic UI updates (update UI immediately, revert on error)
3. Show loading state during update
4. Allow users to upload avatar to your storage service first, then send URL
5. Provide clear error messages for invalid inputs
6. Cache updated profile locally
7. Implement form validation with user-friendly error messages

**UI Flow Suggestion:**

```
1. Fetch current profile data (GET /api/mobile/profile)
2. Display in edit form with current values
3. User modifies desired fields
4. Validate input on the client side
5. Show "Updating..." loading indicator
6. Send PUT request with modified fields
7. Update local cache and UI on success
8. Show error message if request fails
9. Allow retry or contact support for persistent errors
```

---

## Error Handling

### Standard Error Response Format

All error responses follow this consistent format:

```json
{
  "success": false,
  "message": "Descriptive error message"
}
```

### HTTP Status Codes

| Status Code | Description | Common Causes |
|-------------|-------------|---------------|
| `200 OK` | Request succeeded | Successful API call |
| `400 Bad Request` | Invalid request data | Missing required fields, invalid data format |
| `401 Unauthorized` | Authentication failed | Missing token, invalid token, expired token |
| `403 Forbidden` | Access denied | User doesn't have permission |
| `404 Not Found` | Resource not found | Invalid ID, resource deleted |
| `500 Internal Server Error` | Server error | Database error, unexpected exception |

### Common Error Scenarios

**1. Missing or Invalid Token**
```json
{
  "success": false,
  "message": "Invalid or expired token"
}
```
**Action:** Re-authenticate user by calling login endpoint

**2. Token Expired**
```json
{
  "success": false,
  "message": "Invalid or expired token"
}
```
**Action:** Redirect user to login screen

**3. Network Error**
```json
{
  "success": false,
  "message": "Internal server error"
}
```
**Action:** Display error message, implement retry logic

**4. Quiz Not Found**
```json
{
  "success": false,
  "message": "Quiz not found"
}
```
**Action:** Refresh quiz list, quiz may have been deleted

**5. Quiz Time Constraints**
```json
{
  "success": false,
  "message": "Quiz has expired"
}
```
**Action:** Show quiz as closed/completed in UI

**6. Max Attempts Reached**
```json
{
  "success": false,
  "message": "Maximum attempts reached"
}
```
**Action:** Disable start button, show attempt history

### Error Handling Best Practices

1. **Always check `success` field** before accessing `data`
2. **Display user-friendly error messages** to users
3. **Implement retry logic** for network errors
4. **Log errors** for debugging and analytics
5. **Handle network timeouts** gracefully
6. **Show loading states** during API calls
7. **Provide retry options** for recoverable errors
8. **Contact support** for persistent errors

---

## Integration Guide

### Authentication Flow

```
┌─────────┐         ┌──────────┐         ┌─────────────┐
│  App    │         │  Server  │         │   Database  │
└────┬────┘         └────┬─────┘         └──────┬──────┘
     │                   │                      │
     │ 1. Login(email, password)          │
     ├──────────────────>│                      │
     │                   │                      │
     │                   │ 2. Validate user    │
     │                   ├─────────────────────>│
     │                   │<─────────────────────┤
     │                   │                      │
     │ 3. Return token + user data         │
     │<──────────────────┤                      │
     │                   │                      │
     │ 4. Store token securely              │
     │ ◄──────────────────                      │
     │                   │                      │
     │ 5. Subsequent requests (with token)  │
     ├──────────────────>│                      │
     │                   │                      │
     │                   │ 6. Verify token     │
     │                   ├─────────────────────>│
     │                   │<─────────────────────┤
     │                   │                      │
     │ 7. Return data                     │
     │<──────────────────┤                      │
     └                   └───────────────────────┘
```

### Quiz Taking Flow

```
┌─────────┐         ┌──────────┐         ┌─────────────┐
│  App    │         │  Server  │         │   Database  │
└────┬────┘         └────┬─────┘         └──────┬──────┘
     │                   │                      │
     │ 1. GET /quiz (list)                │
     ├──────────────────>│                      │
     │<──────────────────┤                      │
     │                   │                      │
     │ 2. User selects quiz                │
     │ ◄──────────────────                      │
     │                   │                      │
     │ 3. GET /quiz/:id (start)            │
     ├──────────────────>│                      │
     │                   │ 4. Create attempt    │
     │                   ├─────────────────────>│
     │                   │<─────────────────────┤
     │<──────────────────┤                      │
     │                   │                      │
     │ 5. Display questions + timer         │
     │ ◄──────────────────                      │
     │                   │                      │
     │ 6. User answers questions            │
     │ (locally)         │                      │
     │ ◄──────────────────                      │
     │                   │                      │
     │ 7. POST /quiz/:id/submit           │
     │    (answers)       │                      │
     ├──────────────────>│                      │
     │                   │ 8. Calculate score   │
     │                   ├─────────────────────>│
     │                   │<─────────────────────┤
     │<──────────────────┤                      │
     │                   │                      │
     │ 9. Display results                  │
     │ ◄──────────────────                      │
     └                   └───────────────────────┘
```

### Code Examples

#### Swift (iOS)

**Login Example:**
```swift
func login(email: String, password: String) async throws -> LoginResponse {
    let url = URL(string: "http://localhost:3000/api/mobile/auth/login")!
    var request = URLRequest(url: url)
    request.httpMethod = "POST"
    request.setValue("application/json", forHTTPHeaderField: "Content-Type")
    
    let body: [String: String] = [
        "email": email,
        "password": password
    ]
    request.httpBody = try? JSONSerialization.data(withJSONObject: body)
    
    let (data, response) = try await URLSession.shared.data(for: request)
    
    guard let httpResponse = response as? HTTPURLResponse,
          httpResponse.statusCode == 200 else {
        throw APIError.requestFailed
    }
    
    let loginResponse = try JSONDecoder().decode(LoginResponse.self, from: data)
    
    // Store token securely in Keychain
    try KeychainHelper.save(key: "auth_token", value: loginResponse.data.token)
    
    return loginResponse
}

// Usage:
do {
    let response = try await login(email: "user@example.com", password: "password123")
    print("Login successful: \(response.data.user.name)")
} catch {
    print("Login failed: \(error)")
}
```

**Get Quiz List Example:**
```swift
func getQuizList() async throws -> QuizListResponse {
    let token = try KeychainHelper.get(key: "auth_token")
    
    let url = URL(string: "http://localhost:3000/api/mobile/quiz")!
    var request = URLRequest(url: url)
    request.httpMethod = "GET"
    request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
    
    let (data, response) = try await URLSession.shared.data(for: request)
    
    guard let httpResponse = response as? HTTPURLResponse,
          httpResponse.statusCode == 200 else {
        throw APIError.requestFailed
    }
    
    return try JSONDecoder().decode(QuizListResponse.self, from: data)
}
```

#### Kotlin (Android)

**Login Example:**
```kotlin
suspend fun login(email: String, password: String): LoginResponse {
    val client = OkHttpClient()
    val json = """
        {
            "email": "$email",
            "password": "$password"
        }
    """.trimIndent()
    
    val body = json.toRequestBody("application/json".toMediaType())
    val request = Request.Builder()
        .url("http://localhost:3000/api/mobile/auth/login")
        .post(body)
        .build()
    
    val response = client.newCall(request).execute()
    
    if (!response.isSuccessful) {
        throw APIException("Login failed: ${response.code}")
    }
    
    val loginResponse = Gson().fromJson(
        response.body?.string(),
        LoginResponse::class.java
    )
    
    // Store token securely in Keystore
    KeyStoreHelper.saveToken("auth_token", loginResponse.data.token)
    
    return loginResponse
}

// Usage:
GlobalScope.launch(Dispatchers.IO) {
    try {
        val response = login("user@example.com", "password123")
        println("Login successful: ${response.data.user.name}")
    } catch (e: Exception) {
        println("Login failed: ${e.message}")
    }
}
```

**Get Quiz List Example:**
```kotlin
suspend fun getQuizList(): QuizListResponse {
    val token = KeyStoreHelper.getToken("auth_token") ?: throw APIException("No token found")
    
    val client = OkHttpClient()
    val request = Request.Builder()
        .url("http://localhost:3000/api/mobile/quiz")
        .get()
        .addHeader("Authorization", "Bearer $token")
        .build()
    
    val response = client.newCall(request).execute()
    
    if (!response.isSuccessful) {
        throw APIException("Request failed: ${response.code}")
    }
    
    return Gson().fromJson(
        response.body?.string(),
        QuizListResponse::class.java
    )
}
```

### Testing with cURL

**1. Login**
```bash
curl -X POST http://localhost:3000/api/mobile/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "seedtestuser1@test.org",
    "password": "testuser123"
  }'
```

**2. Get Quiz List (using token from login)**
```bash
curl http://localhost:3000/api/mobile/quiz \
  -H "Authorization: Bearer YOUR_JWT_TOKEN_HERE"
```

**3. Get Quiz Data**
```bash
curl http://localhost:3000/api/mobile/quiz/cl7xxxxxxxxxxxxxxxxxx \
  -H "Authorization: Bearer YOUR_JWT_TOKEN_HERE"
```

**4. Submit Quiz**
```bash
curl -X POST http://localhost:3000/api/mobile/quiz/cl7xxxxxxxxxxxxxxxxxx/submit \
  -H "Authorization: Bearer YOUR_JWT_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "attemptId": "cl7xxxxxxxxxxxxxxxxxx",
    "answers": {
      "cl7xxxxxxxxxxxxxxxxxx": "C",
      "cl7xxxxxxxxxxxxxxxxxx": "[\"A\",\"B\",\"D\"]"
    }
  }'
```

**5. View Profile**
```bash
curl http://localhost:3000/api/mobile/profile \
  -H "Authorization: Bearer YOUR_JWT_TOKEN_HERE"
```

**6. Edit Profile**
```bash
curl -X PUT http://localhost:3000/api/mobile/profile \
  -H "Authorization: Bearer YOUR_JWT_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Updated Name",
    "phone": "+1234567890"
  }'
```

### Sample Test Credentials

Based on seeded data from the application:


**Sample Users (Seed Data):**
```
Email: seedtestuser1@test.org to seedtestuser20@test.org
Password: testuser123

Example:
Email: seedtestuser1@test.org
Password: testuser123
```

---

## Mobile App Integration Best Practices

### 1. Token Management

✅ **Do:**
- Store JWT token securely (Keychain/Keystore)
- Implement automatic token refresh
- Clear token on logout
- Validate token before each request

❌ **Don't:**
- Store token in plain text files
- Store token in UserDefaults/SharedPreferences
- Share tokens across users
- Ignore token expiry

### 2. Offline Support

✅ **Do:**
- Cache quiz data locally
- Implement offline mode indicators
- Sync data when connection restored
- Queue failed requests for retry

❌ **Don't:**
- Assume always-online connectivity
- Lose user's unsaved data
- Show network errors for all operations
- Skip offline testing

### 3. User Experience

✅ **Do:**
- Show loading states during API calls
- Implement pull-to-refresh
- Provide helpful error messages
- Allow users to retry failed operations
- Display progress indicators for long operations

❌ **Don't:**
- Freeze UI during API calls
- Show raw error messages to users
- Lose user's unsaved progress
- Fail silently without feedback

### 4. Security

✅ **Do:**
- Use HTTPS in production
- Validate all inputs
- Implement rate limiting
- Log out on suspicious activity
- Keep tokens secure

❌ **Don't:**
- Log sensitive data
- Send passwords in plain text
- Cache sensitive information
- Disable certificate validation

### 5. Performance

✅ **Do:**
- Implement request caching
- Use lazy loading for lists
- Optimize images
- Minimize API calls
- Implement pagination for large datasets

❌ **Don't:**
- Fetch all data at once
- Ignore caching opportunities
- Make unnecessary API calls
- Block main thread with network calls

---

## Support & Contact

For API-related issues, questions, or feature requests, please contact:
- **Email:** support@example.com
- **Documentation:** Check this file regularly for updates
- **Issues:** Report bugs with detailed information including:
  - API endpoint
  - Request payload
  - Response received
  - Expected behavior
  - Device/Platform information

---

## Changelog

### Version 1.0.0 (2024-01-15)
- Initial release
- Authentication APIs
- Quiz Management APIs
- Profile Management APIs
- Complete documentation

---

**Last Updated:** 2024-01-15
**Documentation Version:** 1.0.0
