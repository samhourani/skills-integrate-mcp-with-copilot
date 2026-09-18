document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");
  const loginButton = document.getElementById("login-button");
  const logoutButton = document.getElementById("logout-button");
  const loginModal = document.getElementById("login-modal");
  const loginForm = document.getElementById("login-form");
  const closeLoginModalButton = document.getElementById("close-login-modal");
  const userBadge = document.getElementById("user-badge");
  const userName = document.getElementById("user-name");
  const roleBadge = document.getElementById("role-badge");

  let currentUser = null;

  function loadStoredUser() {
    const storedUser = localStorage.getItem("mergington-user");
    if (!storedUser) {
      return null;
    }

    try {
      return JSON.parse(storedUser);
    } catch (error) {
      console.error("Failed to parse stored user:", error);
      localStorage.removeItem("mergington-user");
      return null;
    }
  }

  function formatRole(role) {
    if (!role) {
      return "Student";
    }

    if (role === "club_leader") {
      return "Club Leader";
    }

    if (role === "admin") {
      return "Admin";
    }

    return "Student";
  }

  function syncAuthUI() {
    const isLoggedIn = Boolean(currentUser);
    userBadge.classList.toggle("hidden", !isLoggedIn);
    loginButton.classList.toggle("hidden", isLoggedIn);
    logoutButton.classList.toggle("hidden", !isLoggedIn);

    if (currentUser) {
      userName.textContent = currentUser.name || currentUser.email || "School user";
      roleBadge.textContent = formatRole(currentUser.role);
    }
  }

  function setCurrentUser(user) {
    currentUser = user;
    if (user) {
      localStorage.setItem("mergington-user", JSON.stringify(user));
    } else {
      localStorage.removeItem("mergington-user");
    }
    syncAuthUI();
  }

  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      activitiesList.innerHTML = "";
      activitySelect.innerHTML = '<option value="">-- Select an activity --</option>';

      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft = details.max_participants - details.participants.length;
        const canManageParticipants = Boolean(
          currentUser && ["admin", "club_leader"].includes(currentUser.role)
        );

        const participantControls = canManageParticipants
          ? details.participants
              .map(
                (email) =>
                  `<li><span class="participant-email">${email}</span><button class="delete-btn" data-activity="${name}" data-email="${email}">❌</button></li>`
              )
              .join("")
          : details.participants
              .map((email) => `<li><span class="participant-email">${email}</span></li>`)
              .join("");

        const participantsHTML =
          details.participants.length > 0
            ? `<div class="participants-section">
              <h5>Participants:</h5>
              <ul class="participants-list">
                ${participantControls}
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

        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });

      document.querySelectorAll(".delete-btn").forEach((button) => {
        button.addEventListener("click", handleUnregister);
      });
    } catch (error) {
      activitiesList.innerHTML =
        "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  async function handleUnregister(event) {
    const button = event.target;
    const activity = button.getAttribute("data-activity");
    const email = button.getAttribute("data-email");

    if (!currentUser || !["admin", "club_leader"].includes(currentUser.role)) {
      messageDiv.textContent = "Please log in as a club leader or admin to manage participant rosters.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
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
            "X-User-Role": currentUser.role,
            "X-User-Email": currentUser.email,
          },
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to unregister. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error unregistering:", error);
    }
  }

  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
          headers: currentUser
            ? {
                "X-User-Role": currentUser.role,
                "X-User-Email": currentUser.email,
              }
            : {}
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        signupForm.reset();
        fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  loginButton.addEventListener("click", () => {
    loginModal.classList.remove("hidden");
    loginModal.setAttribute("aria-hidden", "false");
    document.getElementById("login-email").focus();
  });

  closeLoginModalButton.addEventListener("click", () => {
    loginModal.classList.add("hidden");
    loginModal.setAttribute("aria-hidden", "true");
  });

  loginModal.addEventListener("click", (event) => {
    if (event.target === loginModal) {
      loginModal.classList.add("hidden");
      loginModal.setAttribute("aria-hidden", "true");
    }
  });

  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("login-email").value.trim();
    const password = document.getElementById("login-password").value;

    try {
      const response = await fetch("/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const result = await response.json();

      if (!response.ok) {
        messageDiv.textContent = result.detail || "Login failed.";
        messageDiv.className = "error";
        messageDiv.classList.remove("hidden");
        return;
      }

      setCurrentUser(result);
      loginModal.classList.add("hidden");
      loginForm.reset();
      messageDiv.textContent = `${result.name || result.email} logged in as ${formatRole(result.role)}.`;
      messageDiv.className = "success";
      messageDiv.classList.remove("hidden");
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
      fetchActivities();
    } catch (error) {
      messageDiv.textContent = "Unable to log in right now. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Login error:", error);
    }
  });

  logoutButton.addEventListener("click", () => {
    setCurrentUser(null);
    messageDiv.textContent = "You have been logged out.";
    messageDiv.className = "info";
    messageDiv.classList.remove("hidden");
    setTimeout(() => {
      messageDiv.classList.add("hidden");
    }, 5000);
    fetchActivities();
  });

  currentUser = loadStoredUser();
  syncAuthUI();
  fetchActivities();
});
