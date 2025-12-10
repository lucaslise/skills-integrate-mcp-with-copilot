document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");
  
  // Auth elements
  const userButton = document.getElementById("user-button");
  const userDropdown = document.getElementById("user-dropdown");
  const loginBtn = document.getElementById("login-btn");
  const logoutBtn = document.getElementById("logout-btn");
  const loginModal = document.getElementById("login-modal");
  const closeModal = document.querySelector(".close-modal");
  const loginForm = document.getElementById("login-form");
  const loginMessage = document.getElementById("login-message");
  const loggedInSection = document.getElementById("logged-in-section");
  const loggedOutSection = document.getElementById("logged-out-section");
  const usernameDisplay = document.getElementById("username-display");
  const signupContainer = document.getElementById("signup-container");

  // Store auth token
  let authToken = localStorage.getItem("authToken");

  // Check authentication status on load
  checkAuthStatus();

  // Store auth token
  let authToken = localStorage.getItem("authToken");

  // Check authentication status on load
  checkAuthStatus();

  // Toggle user dropdown
  userButton.addEventListener("click", () => {
    userDropdown.classList.toggle("hidden");
  });

  // Close dropdown when clicking outside
  document.addEventListener("click", (e) => {
    if (!e.target.closest("#user-icon")) {
      userDropdown.classList.add("hidden");
    }
  });

  // Show login modal
  loginBtn.addEventListener("click", () => {
    loginModal.classList.remove("hidden");
    userDropdown.classList.add("hidden");
  });

  // Close modal
  closeModal.addEventListener("click", () => {
    loginModal.classList.add("hidden");
    loginMessage.classList.add("hidden");
  });

  // Close modal when clicking outside
  window.addEventListener("click", (e) => {
    if (e.target === loginModal) {
      loginModal.classList.add("hidden");
      loginMessage.classList.add("hidden");
    }
  });

  // Handle login form submission
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    
    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;

    try {
      const response = await fetch(
        `/login?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`,
        { method: "POST" }
      );

      const result = await response.json();

      if (response.ok) {
        authToken = result.token;
        localStorage.setItem("authToken", authToken);
        loginModal.classList.add("hidden");
        loginForm.reset();
        checkAuthStatus();
        showMessage(messageDiv, `Welcome, ${result.username}!`, "success");
      } else {
        loginMessage.textContent = result.detail || "Login failed";
        loginMessage.className = "error";
        loginMessage.classList.remove("hidden");
      }
    } catch (error) {
      loginMessage.textContent = "Login failed. Please try again.";
      loginMessage.className = "error";
      loginMessage.classList.remove("hidden");
      console.error("Error logging in:", error);
    }
  });

  // Handle logout
  logoutBtn.addEventListener("click", async () => {
    try {
      await fetch("/logout", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${authToken}`
        }
      });
    } catch (error) {
      console.error("Error logging out:", error);
    }

    authToken = null;
    localStorage.removeItem("authToken");
    userDropdown.classList.add("hidden");
    checkAuthStatus();
    showMessage(messageDiv, "Logged out successfully", "info");
  });

  // Check authentication status
  async function checkAuthStatus() {
    if (authToken) {
      try {
        const response = await fetch("/auth/status", {
          headers: {
            "Authorization": `Bearer ${authToken}`
          }
        });
        const result = await response.json();

        if (result.authenticated) {
          loggedInSection.classList.remove("hidden");
          loggedOutSection.classList.add("hidden");
          usernameDisplay.textContent = result.username;
          signupContainer.classList.remove("hidden");
          return;
        }
      } catch (error) {
        console.error("Error checking auth status:", error);
      }
    }

    // Not authenticated
    authToken = null;
    localStorage.removeItem("authToken");
    loggedInSection.classList.add("hidden");
    loggedOutSection.classList.remove("hidden");
    signupContainer.classList.add("hidden");
  }

  // Helper function to show messages
  function showMessage(element, text, className) {
    element.textContent = text;
    element.className = className;
    element.classList.remove("hidden");
    setTimeout(() => {
      element.classList.add("hidden");
    }, 5000);
  }

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft =
          details.max_participants - details.participants.length;

        // Create participants HTML with delete icons instead of bullet points
        const participantsHTML =
          details.participants.length > 0
            ? `<div class="participants-section">
              <h5>Participants:</h5>
              <ul class="participants-list">
                ${details.participants
                  .map(
                    (email) =>
                      `<li><span class="participant-email">${email}</span><button class="delete-btn" data-activity="${name}" data-email="${email}">❌</button></li>`
                  )
                  .join("")}
              </ul>
            </div>`
            : `<p><em>No participants yet</em></p>`;

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
          <div class="participants-container">
            ${participantsHTML}
          </div>
        `;

        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });

      // Add event listeners to delete buttons
      document.querySelectorAll(".delete-btn").forEach((button) => {
        button.addEventListener("click", handleUnregister);
      });

      // Show/hide delete buttons based on auth status
      updateDeleteButtonsVisibility();
    } catch (error) {
      activitiesList.innerHTML =
        "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Show/hide delete buttons based on authentication
  function updateDeleteButtonsVisibility() {
    const deleteButtons = document.querySelectorAll(".delete-btn");
    deleteButtons.forEach(button => {
      if (authToken) {
        button.style.display = "inline-block";
      } else {
        button.style.display = "none";
      }
    });
  }

  // Handle unregister functionality
  async function handleUnregister(event) {
    const button = event.target;
    const activity = button.getAttribute("data-activity");
    const email = button.getAttribute("data-email");

    if (!authToken) {
      showMessage(messageDiv, "Please log in as a teacher to unregister students", "error");
      return;
    }

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/unregister?email=${encodeURIComponent(email)}`,
        {
          method: "DELETE",
          headers: {
            "Authorization": `Bearer ${authToken}`
          }
        }
      );

      const result = await response.json();

      if (response.ok) {
        showMessage(messageDiv, result.message, "success");
        fetchActivities();
      } else {
        if (response.status === 401) {
          showMessage(messageDiv, "Session expired. Please log in again.", "error");
          authToken = null;
          localStorage.removeItem("authToken");
          checkAuthStatus();
        } else {
          showMessage(messageDiv, result.detail || "An error occurred", "error");
        }
      }
    } catch (error) {
      showMessage(messageDiv, "Failed to unregister. Please try again.", "error");
      console.error("Error unregistering:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!authToken) {
      showMessage(messageDiv, "Please log in as a teacher to register students", "error");
      return;
    }

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${authToken}`
          }
        }
      );

      const result = await response.json();

      if (response.ok) {
        showMessage(messageDiv, result.message, "success");
        signupForm.reset();
        fetchActivities();
      } else {
        if (response.status === 401) {
          showMessage(messageDiv, "Session expired. Please log in again.", "error");
          authToken = null;
          localStorage.removeItem("authToken");
          checkAuthStatus();
        } else {
          showMessage(messageDiv, result.detail || "An error occurred", "error");
        }
      }
    } catch (error) {
      showMessage(messageDiv, "Failed to sign up. Please try again.", "error");
      console.error("Error signing up:", error);
    }
  });

  // Initialize app
  fetchActivities();
});
