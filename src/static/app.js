document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");

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

        const spotsLeft = details.max_participants - details.participants.length;

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
        `;

        // Participants section
        const participantsDiv = document.createElement("div");
        participantsDiv.className = "participants";

        const participantsTitle = document.createElement("strong");
        participantsTitle.textContent = "Participants:";
        participantsDiv.appendChild(participantsTitle);

        const participants = Array.isArray(details.participants) ? details.participants : [];
        if (participants.length === 0) {
          const none = document.createElement("p");
          none.className = "no-participants";
          none.textContent = "No participants yet";
          participantsDiv.appendChild(none);
        } else {
          const ul = document.createElement("ul");
          // Render each participant as a row with a delete button
          participants.forEach((p) => {
            const li = document.createElement("li");
            li.className = "participant";
            // raw data attributes (will be encoded before use)
            li.dataset.activity = name;
            li.dataset.email = p;

            const span = document.createElement("span");
            span.className = "participant-name";
            span.textContent = p;

            const btn = document.createElement("button");
            btn.className = "remove-participant";
            btn.type = "button";
            btn.title = "Unregister participant";
            btn.setAttribute("aria-label", `Unregister ${p}`);
            // store activity and email on the button too for convenience
            btn.dataset.activity = name;
            btn.dataset.email = p;
            btn.innerHTML = "&times;";

            li.appendChild(span);
            li.appendChild(btn);
            ul.appendChild(li);
          });
          participantsDiv.appendChild(ul);
        }

        activityCard.appendChild(participantsDiv);
        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle form submission (unchanged except showing messages)
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        signupForm.reset();

        // Append the new participant to the corresponding activity card if present
        // Find the activity card's participants ul
        // We added dataset.activity on rendered participant li/button, so find by matching activity name
        // This avoids a full refresh and shows the new participant immediately.
        const activityCards = activitiesList.querySelectorAll(".activity-card");
        for (const card of activityCards) {
          const h4 = card.querySelector("h4");
          if (h4 && h4.textContent === activity) {
            const participantsDiv = card.querySelector(".participants");
            if (!participantsDiv) break;

            // If there's a "No participants yet" paragraph, remove it and create a ul
            let ul = participantsDiv.querySelector("ul");
            const none = participantsDiv.querySelector(".no-participants");
            if (none) {
              none.remove();
              ul = document.createElement("ul");
              participantsDiv.appendChild(ul);
            }
            if (!ul) {
              ul = document.createElement("ul");
              participantsDiv.appendChild(ul);
            }

            // Create new li with delete button
            const li = document.createElement("li");
            li.className = "participant";
            li.dataset.activity = activity;
            li.dataset.email = result.email || email;

            const span = document.createElement("span");
            span.className = "participant-name";
            span.textContent = result.email || email;

            const btn = document.createElement("button");
            btn.className = "remove-participant";
            btn.type = "button";
            btn.title = "Unregister participant";
            btn.setAttribute("aria-label", `Unregister ${result.email || email}`);
            btn.dataset.activity = activity;
            btn.dataset.email = result.email || email;
            btn.innerHTML = "&times;";

            li.appendChild(span);
            li.appendChild(btn);
            ul.appendChild(li);

            break;
          }
        }
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
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

  // Delegate remove/unregister clicks for participants
  document.addEventListener("click", async (ev) => {
    const btn = ev.target.closest(".remove-participant");
    if (!btn) return;

    const activity = btn.dataset.activity;
    const email = btn.dataset.email;
    if (!activity || !email) return;

    const confirmed = confirm(`Unregister ${email} from ${activity}?`);
    if (!confirmed) return;

    // disable button during request
    btn.disabled = true;

    try {
      const res = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        { method: "DELETE" }
      );

      if (!res.ok) {
        let errText = await res.text().catch(() => null);
        throw new Error(errText || `Failed to unregister (${res.status})`);
      }

      // remove the li
      const li = btn.closest("li.participant");
      if (li) {
        const ul = li.parentElement;
        li.remove();
        // if ul is empty, replace with "No participants yet"
        if (ul && ul.children.length === 0) {
          const participantsDiv = ul.closest(".participants");
          if (participantsDiv) {
            const none = document.createElement("p");
            none.className = "no-participants";
            none.textContent = "No participants yet";
            participantsDiv.appendChild(none);
            ul.remove();
          }
        }
      }

      // optional: show a small success message
      messageDiv.textContent = `${email} unregistered from ${activity}.`;
      messageDiv.className = "success";
      messageDiv.classList.remove("hidden");
      setTimeout(() => messageDiv.classList.add("hidden"), 3000);
    } catch (err) {
      console.error("Error unregistering participant:", err);
      alert("Could not unregister participant: " + (err.message || err));
      btn.disabled = false;
    }
  });

  // Initialize app
  fetchActivities();
});
