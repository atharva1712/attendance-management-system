// API Base URL
const API_BASE_URL = 'http://localhost:5000';

// Utility Functions
function showMessage(message, type = 'info') {
  const messageDiv = document.getElementById('message');
  if (messageDiv) {
    messageDiv.innerHTML = message;
    messageDiv.className = `message ${type}`;
    messageDiv.classList.remove('hidden');
  }
}

function hideMessage() {
  const messageDiv = document.getElementById('message');
  if (messageDiv) {
    messageDiv.classList.add('hidden');
  }
}

function getStoredToken() {
  return localStorage.getItem('token');
}

function getStoredUserRole() {
  return localStorage.getItem('userRole');
}

function getStoredUserData() {
  const userData = localStorage.getItem('userData');
  return userData ? JSON.parse(userData) : null;
}

function storeAuthData(token, role, userData) {
  localStorage.setItem('token', token);
  localStorage.setItem('userRole', role);
  localStorage.setItem('userData', JSON.stringify(userData));
}

function clearAuthData() {
  localStorage.removeItem('token');
  localStorage.removeItem('userRole');
  localStorage.removeItem('userData');
}

// Authentication Functions
async function handleLogin(event) {
  event.preventDefault();
  hideMessage();

  const formData = new FormData(event.target);
  const role = formData.get('role');
  const email = formData.get('email');
  const password = formData.get('password');

  if (!role || !email || !password) {
    showMessage('❗ Please fill in all fields', 'error');
    return;
  }

  try {
    const endpoint = role === 'teacher' ? '/api/teachers/login' : '/api/students/login';
    
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, password })
    });

    const data = await response.json();

    if (response.ok) {
      const userData = role === 'teacher' ? data.teacher : data.student;
      storeAuthData(data.token, role, userData);
      showMessage('✅ Login successful! Redirecting...', 'success');
      
      setTimeout(() => {
        window.location.href = 'dashboard.html';
      }, 1500);
    } else {
      showMessage(`❌ ${data.error || 'Login failed'}`, 'error');
    }
  } catch (error) {
    console.error('Login error:', error);
    showMessage('❌ Could not connect to server', 'error');
  }
}

async function handleRegister(event) {
  event.preventDefault();
  hideMessage();

  const formData = new FormData(event.target);
  const role = formData.get('role');
  const name = formData.get('name');
  const email = formData.get('email');
  const password = formData.get('password');

  if (!role || !name || !email || !password) {
    showMessage('❗ Please fill in all required fields', 'error');
    return;
  }

  let requestBody = { name, email, password };
  let endpoint;

  if (role === 'teacher') {
    const subject = formData.get('subject');
    if (!subject) {
      showMessage('❗ Subject is required for teachers', 'error');
      return;
    }
    requestBody.subject = subject;
    endpoint = '/api/teachers/register';
  } else {
    const branch = formData.get('branch');
    const year = formData.get('year');
    if (!branch || !year) {
      showMessage('❗ Branch and year are required for students', 'error');
      return;
    }
    requestBody.branch = branch;
    requestBody.year = parseInt(year);
    endpoint = '/api/students/register';
  }

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    const data = await response.json();

    if (response.ok) {
      showMessage('✅ Registration successful! You can now login.', 'success');
      
      setTimeout(() => {
        window.location.href = 'login.html';
      }, 2000);
    } else {
      showMessage(`❌ ${data.error || 'Registration failed'}`, 'error');
    }
  } catch (error) {
    console.error('Registration error:', error);
    showMessage('❌ Could not connect to server', 'error');
  }
}

function handleLogout() {
  clearAuthData();
  showMessage('✅ Logged out successfully', 'success');
  setTimeout(() => {
    window.location.href = 'login.html';
  }, 1000);
}

// Dashboard Functions
function initializeDashboard() {
  const token = getStoredToken();
  const role = getStoredUserRole();
  const userData = getStoredUserData();

  if (!token || !role || !userData) {
    window.location.href = 'login.html';
    return;
  }

  // Update welcome message
  const welcomeElement = document.getElementById('userWelcome');
  if (welcomeElement) {
    welcomeElement.textContent = `Welcome, ${userData.name}! (${role.charAt(0).toUpperCase() + role.slice(1)})`;
  }

  // Show appropriate dashboard
  if (role === 'teacher') {
    document.getElementById('teacherDashboard').classList.remove('hidden');
    // Set today's date as default
    const today = new Date().toISOString().split('T')[0];
    const dateInput = document.getElementById('attendanceDate');
    if (dateInput) {
      dateInput.value = today;
    }
    // Set up form submission handler
    const markAttendanceForm = document.getElementById('markAttendanceForm');
    if (markAttendanceForm) {
      markAttendanceForm.addEventListener('submit', handleMarkAttendance);
    }
  } else {
    document.getElementById('studentDashboard').classList.remove('hidden');
  }
}

async function fetchAttendanceSummary() {
  const token = getStoredToken();
  const loadingElement = document.getElementById('loadingMessage');
  const attendanceSection = document.getElementById('attendanceSection');
  const tableBody = document.querySelector('#attendanceTable tbody');

  if (!token) {
    showMessage('❌ No authentication token found', 'error');
    return;
  }

  hideMessage();
  loadingElement.classList.remove('hidden');
  attendanceSection.classList.add('hidden');
  tableBody.innerHTML = '';

  try {
    const response = await fetch(`${API_BASE_URL}/api/teachers/attendance-summary`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const data = await response.json();
    loadingElement.classList.add('hidden');

    if (response.ok) {
      attendanceSection.classList.remove('hidden');
      
      if (data.summary && data.summary.length > 0) {
        data.summary.forEach((record) => {
          const totalDays = record.present + record.absent + record.late;
          const attendancePercentage = totalDays > 0 ? ((record.present / totalDays) * 100).toFixed(1) : '0.0';
          
          const row = document.createElement('tr');
          row.innerHTML = `
            <td>${record.student_id}</td>
            <td>${record.name}</td>
            <td class="text-center">${record.present}</td>
            <td class="text-center">${record.absent}</td>
            <td class="text-center">${record.late}</td>
            <td class="text-center">${totalDays}</td>
            <td class="text-center">${attendancePercentage}%</td>
          `;
          tableBody.appendChild(row);
        });
        showMessage('✅ Attendance summary loaded successfully!', 'success');
      } else {
        showMessage('ℹ️ No attendance records found', 'info');
      }
    } else {
      showMessage(`❌ ${data.error || 'Failed to fetch attendance summary'}`, 'error');
    }
  } catch (error) {
    loadingElement.classList.add('hidden');
    console.error('Fetch attendance summary error:', error);
    showMessage('❌ Could not connect to server', 'error');
  }
}

async function fetchStudentAttendance() {
  const token = getStoredToken();
  const attendanceSection = document.getElementById('studentAttendanceSection');
  const tableBody = document.querySelector('#studentAttendanceTable tbody');
  const attendanceStats = document.getElementById('attendanceStats');
  const subjectFilter = document.getElementById('subjectFilter');

  if (!token) {
    showMessage('❌ No authentication token found', 'error');
    return;
  }

  hideMessage();
  attendanceSection.classList.add('hidden');
  attendanceStats.classList.add('hidden');
  tableBody.innerHTML = '';

  try {
    // Build query parameters for filtering
    const params = new URLSearchParams();
    
    const subject = document.getElementById('subjectFilter').value;
    const dateFrom = document.getElementById('dateFromFilter').value;
    const dateTo = document.getElementById('dateToFilter').value;
    
    if (subject) params.append('subject', subject);
    if (dateFrom) params.append('date_from', dateFrom);
    if (dateTo) params.append('date_to', dateTo);

    const queryString = params.toString();
    const url = `${API_BASE_URL}/api/students/attendance${queryString ? '?' + queryString : ''}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const data = await response.json();

    if (response.ok) {
      // Populate subject filter if not already done
      if (data.subjects && data.subjects.length > 0) {
        const currentValue = subjectFilter.value;
        subjectFilter.innerHTML = '<option value="">All Subjects</option>';
        data.subjects.forEach(subject => {
          const option = document.createElement('option');
          option.value = subject;
          option.textContent = subject;
          if (subject === currentValue) option.selected = true;
          subjectFilter.appendChild(option);
        });
      }

      attendanceSection.classList.remove('hidden');
      
      if (data.attendance && data.attendance.length > 0) {
        // Calculate and display statistics
        const stats = {
          total: data.attendance.length,
          present: data.attendance.filter(r => r.status === 'present').length,
          absent: data.attendance.filter(r => r.status === 'absent').length,
          late: data.attendance.filter(r => r.status === 'late').length
        };
        
        const attendancePercentage = stats.total > 0 ? ((stats.present / stats.total) * 100).toFixed(1) : '0.0';
        
        attendanceStats.innerHTML = `
          <div class="stat-item">
            <span class="stat-number">${stats.total}</span>
            <span class="stat-label">Total Classes</span>
          </div>
          <div class="stat-item">
            <span class="stat-number">${stats.present}</span>
            <span class="stat-label">Present</span>
          </div>
          <div class="stat-item">
            <span class="stat-number">${stats.absent}</span>
            <span class="stat-label">Absent</span>
          </div>
          <div class="stat-item">
            <span class="stat-number">${stats.late}</span>
            <span class="stat-label">Late</span>
          </div>
          <div class="stat-item">
            <span class="stat-number">${attendancePercentage}%</span>
            <span class="stat-label">Attendance Rate</span>
          </div>
        `;
        attendanceStats.classList.remove('hidden');

        // Populate table with attendance records
        data.attendance.forEach((record) => {
          const row = document.createElement('tr');
          const statusClass = record.status === 'present' ? 'success' : record.status === 'late' ? 'warning' : 'error';
          
          row.innerHTML = `
            <td>${new Date(record.date).toLocaleDateString()}</td>
            <td>${record.subject || 'N/A'}</td>
            <td>${record.teacher_name || 'N/A'}</td>
            <td class="text-center"><span class="status ${statusClass}">${record.status.charAt(0).toUpperCase() + record.status.slice(1)}</span></td>
          `;
          tableBody.appendChild(row);
        });
        
        const filterInfo = [];
        if (subject) filterInfo.push(`Subject: ${subject}`);
        if (dateFrom) filterInfo.push(`From: ${dateFrom}`);
        if (dateTo) filterInfo.push(`To: ${dateTo}`);
        
        const filterText = filterInfo.length > 0 ? ` (${filterInfo.join(', ')})` : '';
        showMessage(`✅ ${data.attendance.length} attendance records loaded successfully!${filterText}`, 'success');
      } else {
        showMessage('ℹ️ No attendance records found for the selected filters', 'info');
      }
    } else {
      showMessage(`❌ ${data.error || 'Failed to fetch attendance records'}`, 'error');
    }
  } catch (error) {
    console.error('Fetch student attendance error:', error);
    showMessage('❌ Could not connect to server', 'error');
  }
}

// Clear all filters function
function clearFilters() {
  document.getElementById('subjectFilter').value = '';
  document.getElementById('dateFromFilter').value = '';
  document.getElementById('dateToFilter').value = '';
  
  // Hide attendance section and stats
  document.getElementById('studentAttendanceSection').classList.add('hidden');
  document.getElementById('attendanceStats').classList.add('hidden');
  
  hideMessage();
  showMessage('✅ Filters cleared successfully!', 'success');
}

// Attendance Marking Functions
async function loadStudents() {
  const token = getStoredToken();
  const studentSelect = document.getElementById('studentSelect');

  if (!token) {
    showMessage('❌ No authentication token found', 'error');
    return;
  }

  try {
    // Clear existing options except the first one
    studentSelect.innerHTML = '<option value="">Loading students...</option>';
    
    // Fetch real students from the database
    const response = await fetch(`${API_BASE_URL}/api/teachers/students`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const data = await response.json();

    if (response.ok) {
      // Clear loading message
      studentSelect.innerHTML = '<option value="">Choose a student</option>';
      
      if (data.students && data.students.length > 0) {
        data.students.forEach(student => {
          const option = document.createElement('option');
          option.value = student.id;
          option.textContent = `${student.name} (${student.branch} - Year ${student.year})`;
          studentSelect.appendChild(option);
        });
        
        showMessage(`✅ ${data.students.length} students loaded successfully!`, 'success');
      } else {
        showMessage('ℹ️ No students found in the database', 'info');
      }
    } else {
      studentSelect.innerHTML = '<option value="">Failed to load students</option>';
      showMessage(`❌ ${data.error || 'Failed to load students'}`, 'error');
    }
    
  } catch (error) {
    console.error('Load students error:', error);
    studentSelect.innerHTML = '<option value="">Error loading students</option>';
    showMessage('❌ Could not connect to server', 'error');
  }
}

async function handleMarkAttendance(event) {
  event.preventDefault();
  hideMessage();

  const formData = new FormData(event.target);
  const student_id = parseInt(formData.get('student_id'));
  const date = formData.get('date');
  const status = formData.get('status');
  const token = getStoredToken();

  if (!student_id || !date || !status) {
    showMessage('❗ Please fill in all fields', 'error');
    return;
  }

  if (!token) {
    showMessage('❌ No authentication token found', 'error');
    return;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/api/teachers/attendance`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        student_id: student_id,
        date: date,
        status: status
      })
    });

    const data = await response.json();

    if (response.ok) {
      showMessage(`✅ ${data.message}`, 'success');
      
      // Reset form
      event.target.reset();
      
      // Set today's date again
      const today = new Date().toISOString().split('T')[0];
      document.getElementById('attendanceDate').value = today;
      
      // Reload students
      await loadStudents();
      
    } else {
      showMessage(`❌ ${data.error || 'Failed to mark attendance'}`, 'error');
    }
  } catch (error) {
    console.error('Mark attendance error:', error);
    showMessage('❌ Could not connect to server', 'error');
  }
}

// Legacy function for backward compatibility
async function fetchSummary() {
  await fetchAttendanceSummary();
}
