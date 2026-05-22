/* TaskFlow: shared app controller, localStorage state and page modules. */
(() => {
  "use strict";

  const KEYS = {
    users: "taskflow.users",
    currentUser: "taskflow.currentUser",
    settings: "taskflow.settings",
    readNotifications: "taskflow.readNotifications"
  };

  const CATEGORIES = {
    Homework: "#7c3aed",
    Chores: "#10b981",
    School: "#2563eb",
    Sport: "#f59e0b",
    Fitness: "#ef4444",
    Personal: "#06b6d4"
  };

  const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  const SHORT_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  const QUOTES = [
    "Small wins become big momentum when you repeat them.",
    "Focus is a skill. Train it one clean session at a time.",
    "Your future self is built by what you finish today.",
    "Start before you feel ready. Clarity arrives after action.",
    "Consistency beats intensity when the week gets busy.",
    "One task, one timer, one honest effort."
  ];

  const ACHIEVEMENTS = [
    { id: "first-win", title: "First Win", desc: "Complete your first task.", icon: "fa-medal", test: s => s.totalCompleted >= 1 },
    { id: "ten-tasks", title: "Task Climber", desc: "Complete 10 tasks.", icon: "fa-mountain-sun", test: s => s.totalCompleted >= 10 },
    { id: "streak-five", title: "Streak Builder", desc: "Reach a 5 day streak.", icon: "fa-fire-flame-curved", test: s => s.streak >= 5 },
    { id: "xp-500", title: "XP Hunter", desc: "Earn 500 XP.", icon: "fa-bolt", test: s => s.xp >= 500 },
    { id: "scholar", title: "Scholar Mind", desc: "Reach Scholar rank.", icon: "fa-graduation-cap", test: s => getLevelInfo(s.xp).rank === "Scholar" || getLevelInfo(s.xp).level >= 20 },
    { id: "planner", title: "Week Architect", desc: "Create 6 planner blocks.", icon: "fa-calendar-check", test: s => s.plannerBlocks >= 6 },
    { id: "focus-sprints", title: "Deep Focus", desc: "Finish 3 focus sessions.", icon: "fa-stopwatch", test: s => s.focusSessions >= 3 },
    { id: "intelligent-fire", title: "Intelligent Fire", desc: "Reach the highest rank.", icon: "fa-ranking-star", test: s => getLevelInfo(s.xp).rank === "Intelligent Fire" }
  ];

  const DEFAULT_SETTINGS = {
    theme: "dark",
    motion: true,
    reminders: true,
    achievements: true,
    focusMinutes: 25,
    breakMinutes: 5,
    onboarded: false
  };

  const $ = (selector, parent = document) => parent.querySelector(selector);
  const $$ = (selector, parent = document) => Array.from(parent.querySelectorAll(selector));

  document.addEventListener("DOMContentLoaded", init);

  function init() {
    ensureDemoUser();
    initTheme();
    initCursorGlow();
    initReveal();
    initPageTransitions();
    document.body.classList.add("page-ready");

    const page = document.body.dataset.page;
    if (page !== "login") {
      initDemoButtons();
    }

    if ($(".app-shell")) {
      ensureAppUser();
      initAppShell();
      initTaskModal();
      initOnboarding();
    }

    switch (page) {
      case "home":
        initHomePage();
        break;
      case "login":
        initLoginPage();
        break;
      case "dashboard":
        initDashboardPage();
        break;
      case "tasks":
        initTasksPage();
        break;
      case "planner":
        initPlannerPage();
        break;
      case "ai-coach":
        initCoachPage();
        break;
      case "profile":
        initProfilePage();
        break;
      case "contact":
        initContactPage();
        break;
      case "about":
        initAboutPage();
        break;
      case "settings":
        initSettingsPage();
        break;
      default:
        break;
    }
  }

  function readJSON(key, fallback) {
    try {
      const value = localStorage.getItem(key);
      return value ? JSON.parse(value) : fallback;
    } catch {
      return fallback;
    }
  }

  function writeJSON(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function createId(prefix = "id") {
    if (window.crypto && crypto.randomUUID) {
      return `${prefix}-${crypto.randomUUID()}`;
    }
    return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function todayISO(offsetDays = 0) {
    const date = new Date();
    date.setDate(date.getDate() + offsetDays);
    return date.toISOString().slice(0, 10);
  }

  function formatDate(dateString) {
    if (!dateString) return "No date";
    const date = new Date(`${dateString}T12:00:00`);
    return date.toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short" });
  }

  function escapeHTML(value = "") {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function userStorageKey(type, email = getCurrentUser()?.email) {
    const safe = (email || "demo").toLowerCase().replace(/[^a-z0-9]/g, "_");
    return `taskflow.${type}.${safe}`;
  }

  function ensureDemoUser() {
    const users = readJSON(KEYS.users, []);
    if (!users.some(user => user.email === "harvey@student.com")) {
      users.push({
        name: "Harvey",
        email: "harvey@student.com",
        password: "Taskflow10",
        createdAt: new Date().toISOString()
      });
      writeJSON(KEYS.users, users);
    }
  }

  function ensureAppUser() {
    let user = getCurrentUser();
    if (!user) {
      user = { name: "Harvey", email: "harvey@student.com" };
      writeJSON(KEYS.currentUser, user);
    }
    ensureUserData(user.email);
    return user;
  }

  function getCurrentUser() {
    return readJSON(KEYS.currentUser, null);
  }

  function setCurrentUser(user) {
    writeJSON(KEYS.currentUser, { name: user.name, email: user.email });
    ensureUserData(user.email);
  }

  function getSettings() {
    return { ...DEFAULT_SETTINGS, ...readJSON(KEYS.settings, {}) };
  }

  function saveSettings(settings) {
    writeJSON(KEYS.settings, { ...getSettings(), ...settings });
    initTheme();
  }

  function ensureUserData(email) {
    if (!localStorage.getItem(userStorageKey("tasks", email))) {
      writeJSON(userStorageKey("tasks", email), defaultTasks());
    }
    if (!localStorage.getItem(userStorageKey("stats", email))) {
      writeJSON(userStorageKey("stats", email), defaultStats());
    }
    if (!localStorage.getItem(userStorageKey("planner", email))) {
      writeJSON(userStorageKey("planner", email), defaultPlanner());
    }
    if (!localStorage.getItem(userStorageKey("profile", email))) {
      writeJSON(userStorageKey("profile", email), {
        name: getCurrentUser()?.name || "Harvey",
        email,
        school: "Blacktown Boys High School",
        avatar: "assets/avatar.svg"
      });
    }
  }

  function defaultTasks() {
    return [
      {
        id: createId("task"),
        title: "Math assignment draft",
        category: "Homework",
        priority: "High",
        dueDate: todayISO(1),
        repeat: "None",
        progress: 64,
        notes: "Finish algebra section and check examples before submission.",
        completed: false,
        createdAt: new Date().toISOString()
      },
      {
        id: createId("task"),
        title: "Clean study desk",
        category: "Chores",
        priority: "Medium",
        dueDate: todayISO(0),
        repeat: "Weekly",
        progress: 25,
        notes: "Reset workspace before the next focus block.",
        completed: false,
        createdAt: new Date().toISOString()
      },
      {
        id: createId("task"),
        title: "Basketball training bag",
        category: "Sport",
        priority: "Low",
        dueDate: todayISO(2),
        repeat: "Weekly",
        progress: 45,
        notes: "Pack shoes, towel and water bottle.",
        completed: false,
        createdAt: new Date().toISOString()
      },
      {
        id: createId("task"),
        title: "Science quiz revision",
        category: "School",
        priority: "Urgent",
        dueDate: todayISO(-1),
        repeat: "None",
        progress: 80,
        notes: "Revise cells, diffusion and practical notes.",
        completed: false,
        createdAt: new Date().toISOString()
      },
      {
        id: createId("task"),
        title: "Evening walk",
        category: "Fitness",
        priority: "Medium",
        dueDate: todayISO(0),
        repeat: "Daily",
        progress: 100,
        notes: "20 minute reset after homework.",
        completed: true,
        createdAt: new Date().toISOString()
      }
    ];
  }

  function defaultStats() {
    return {
      xp: 420,
      streak: 4,
      bestStreak: 8,
      totalCompleted: 7,
      focusSessions: 1,
      plannerBlocks: 4,
      achievements: ["first-win"],
      weekly: [3, 2, 4, 5, 3, 6, 2],
      heatmap: Array.from({ length: 42 }, () => Math.floor(Math.random() * 5)),
      streakHistory: [1, 2, 2, 3, 1, 4, 5, 3, 2, 6, 4, 5, 7, 4]
    };
  }

  function defaultPlanner() {
    return [
      { id: createId("plan"), title: "Math assignment sprint", day: "Monday", time: "16:00", duration: "60 min", category: "Homework", notes: "Draft final two questions." },
      { id: createId("plan"), title: "Science active recall", day: "Tuesday", time: "17:00", duration: "45 min", category: "School", notes: "Quiz yourself from notes." },
      { id: createId("plan"), title: "Basketball training", day: "Wednesday", time: "15:45", duration: "90 min", category: "Sport", notes: "Court session." },
      { id: createId("plan"), title: "Weekly reset", day: "Sunday", time: "18:00", duration: "30 min", category: "Personal", notes: "Plan next week and clean dashboard." }
    ];
  }

  function getTasks() {
    return readJSON(userStorageKey("tasks"), []);
  }

  function saveTasks(tasks) {
    writeJSON(userStorageKey("tasks"), tasks);
  }

  function getStats() {
    return { ...defaultStats(), ...readJSON(userStorageKey("stats"), {}) };
  }

  function saveStats(stats) {
    writeJSON(userStorageKey("stats"), stats);
  }

  function getPlanner() {
    return readJSON(userStorageKey("planner"), []);
  }

  function savePlanner(planner) {
    writeJSON(userStorageKey("planner"), planner);
  }

  function getProfile() {
    const current = getCurrentUser() || { name: "Harvey", email: "harvey@student.com" };
    return {
      name: current.name,
      email: current.email,
      school: "Blacktown Boys High School",
      avatar: "assets/avatar.svg",
      ...readJSON(userStorageKey("profile", current.email), {})
    };
  }

  function saveProfile(profile) {
    writeJSON(userStorageKey("profile", profile.email), profile);
  }

  function initTheme() {
    const settings = getSettings();
    document.documentElement.dataset.theme = settings.theme || "dark";
    document.body.classList.toggle("reduce-motion", settings.motion === false);
    $$(".theme-toggle i").forEach(icon => {
      icon.className = settings.theme === "dark" ? "fa-solid fa-sun" : "fa-solid fa-moon";
    });
  }

  function initCursorGlow() {
    document.addEventListener("pointermove", event => {
      document.documentElement.style.setProperty("--cursor-x", `${event.clientX}px`);
      document.documentElement.style.setProperty("--cursor-y", `${event.clientY}px`);
    }, { passive: true });
  }

  function initReveal() {
    const items = $$(".reveal");
    if (!items.length) return;
    if (!("IntersectionObserver" in window)) {
      items.forEach(item => item.classList.add("is-visible"));
      return;
    }
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });
    items.forEach(item => observer.observe(item));
  }

  function initPageTransitions() {
    document.addEventListener("click", event => {
      const link = event.target.closest("a[data-transition]");
      if (!link || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const href = link.getAttribute("href");
      if (!href || href.startsWith("#") || link.target === "_blank") return;
      event.preventDefault();
      document.body.classList.add("page-leaving");
      window.setTimeout(() => {
        window.location.href = href;
      }, 160);
    });
  }

  function initHomePage() {
    $(".theme-toggle")?.addEventListener("click", toggleTheme);
  }

  function initDemoButtons() {
    $$("[data-demo-login]").forEach(button => {
      button.addEventListener("click", () => {
        setCurrentUser({ name: "Harvey", email: "harvey@student.com" });
        showToast("Demo loaded", "Opening Harvey's TaskFlow workspace.", "fa-wand-magic-sparkles");
        window.setTimeout(() => {
          window.location.href = "dashboard.html";
        }, 520);
      });
    });
  }

  function initLoginPage() {
    initDemoButtons();
    $(".theme-toggle")?.addEventListener("click", toggleTheme);

    $$("[data-auth-view]").forEach(button => {
      button.addEventListener("click", () => showAuthView(button.dataset.authView));
    });

    $("#signupPassword")?.addEventListener("input", event => {
      updatePasswordStrength(event.target.value);
    });

    $("#loginForm")?.addEventListener("submit", event => {
      event.preventDefault();
      const email = $("#loginEmail").value.trim().toLowerCase();
      const password = $("#loginPassword").value;
      const users = readJSON(KEYS.users, []);
      const user = users.find(item => item.email.toLowerCase() === email && item.password === password);
      if (!email || !password) {
        showToast("Missing details", "Enter your email and password.", "fa-triangle-exclamation");
        return;
      }
      if (!user) {
        showToast("Login failed", "Use the demo account or create a new TaskFlow account.", "fa-lock");
        return;
      }
      if ($("#rememberMe")?.checked) {
        localStorage.setItem("taskflow.rememberedEmail", email);
      }
      setCurrentUser(user);
      successfulAuth();
    });

    $("#signupForm")?.addEventListener("submit", event => {
      event.preventDefault();
      const name = $("#signupName").value.trim();
      const email = $("#signupEmail").value.trim().toLowerCase();
      const password = $("#signupPassword").value;
      const confirm = $("#signupConfirm").value;
      const terms = $("#termsAgree").checked;
      const users = readJSON(KEYS.users, []);

      if (name.length < 2 || !isValidEmail(email) || password.length < 6 || password !== confirm || !terms) {
        showToast("Check the form", "Use a valid email, matching password and accept the agreement.", "fa-circle-exclamation");
        return;
      }
      if (users.some(user => user.email.toLowerCase() === email)) {
        showToast("Account exists", "That email already has a TaskFlow workspace.", "fa-user-check");
        showAuthView("login");
        return;
      }

      const user = { name, email, password, createdAt: new Date().toISOString() };
      users.push(user);
      writeJSON(KEYS.users, users);
      setCurrentUser(user);
      successfulAuth();
    });

    $("[data-google-login]")?.addEventListener("click", () => {
      showToast("Google sign in", "Visual demo only: use the email form or Harvey demo.", "fa-brands fa-google");
    });

    $("[data-forgot-password]")?.addEventListener("click", () => {
      const email = window.prompt("Enter your TaskFlow email:");
      if (email) {
        showToast("Reset link simulated", `A recovery message would be sent to ${email}.`, "fa-envelope");
      }
    });

    const remembered = localStorage.getItem("taskflow.rememberedEmail");
    if (remembered && $("#loginEmail")) {
      $("#loginEmail").value = remembered;
      $("#rememberMe").checked = true;
    }
  }

  function showAuthView(view) {
    $$("[data-auth-view]").forEach(button => button.classList.toggle("active", button.dataset.authView === view));
    $$(".auth-form").forEach(form => form.classList.toggle("active", form.id === `${view}Form`));
  }

  function updatePasswordStrength(password) {
    const meter = $(".strength-meter");
    const text = $("#strengthText");
    if (!meter || !text) return;
    let score = 0;
    if (password.length >= 6) score += 1;
    if (password.length >= 10) score += 1;
    if (/[A-Z]/.test(password)) score += 1;
    if (/[0-9]/.test(password)) score += 1;
    if (/[^A-Za-z0-9]/.test(password)) score += 1;
    const labels = ["Very weak", "Weak", "Okay", "Good", "Strong", "Excellent"];
    const colors = ["#ef4444", "#f97316", "#f59e0b", "#10b981", "#06b6d4", "#7c3aed"];
    meter.style.setProperty("--strength", `${Math.min(score, 5) * 20}%`);
    meter.style.setProperty("--strength-color", colors[score]);
    text.textContent = labels[score];
  }

  function successfulAuth() {
    $(".auth-card")?.classList.add("success");
    showToast("Welcome to TaskFlow", "Your dashboard is loading.", "fa-circle-check");
    window.setTimeout(() => {
      window.location.href = "dashboard.html";
    }, 700);
  }

  function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  function initAppShell() {
    initTheme();
    renderGlobalUser();
    renderGlobalStats();
    initNavigationState();
    initNotifications();
    initQuickActions();
    initKeyboardShortcuts();
    initGlobalSearch();
    initLiveClock();

    $$(".theme-toggle").forEach(button => button.addEventListener("click", toggleTheme));
    $(".menu-toggle")?.addEventListener("click", () => document.body.classList.toggle("sidebar-open"));
    $("[data-logout]")?.addEventListener("click", logout);
  }

  function initNavigationState() {
    const page = document.body.dataset.page;
    $$("[data-page-link]").forEach(link => {
      link.classList.toggle("active", link.dataset.pageLink === page);
    });
  }

  function renderGlobalUser() {
    const user = getCurrentUser() || { name: "Harvey", email: "harvey@student.com" };
    const profile = getProfile();
    const firstName = (profile.name || user.name || "Harvey").split(" ")[0];
    $$("[data-user-firstname]").forEach(el => {
      el.textContent = firstName;
    });
    $$("[data-user-avatar]").forEach(img => {
      img.src = profile.avatar || "assets/avatar.svg";
    });
    const greeting = $("[data-greeting]");
    if (greeting) {
      greeting.textContent = `${getDayGreeting()}, ${firstName} 👋`;
    }
  }

  function getDayGreeting() {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 18) return "Good Afternoon";
    return "Good Evening";
  }

  function getLevelInfo(xp = 0) {
    const level = Math.max(1, Math.floor(xp / 120) + 1);
    let rank = "Beginner";
    if (level >= 50) rank = "Intelligent Fire";
    else if (level >= 20) rank = "Scholar";
    else if (level >= 10) rank = "Productive";
    else if (level >= 5) rank = "Focused";
    const nextLevelXP = level * 120;
    const currentLevelXP = (level - 1) * 120;
    const progress = Math.min(100, Math.round(((xp - currentLevelXP) / 120) * 100));
    return { level, rank, nextLevelXP, progress, toNext: nextLevelXP - xp };
  }

  function renderGlobalStats() {
    const tasks = getTasks();
    const stats = getStats();
    const active = tasks.filter(task => !task.completed).length;
    const completed = tasks.filter(task => task.completed).length + Math.max(0, stats.totalCompleted - tasks.filter(task => task.completed).length);
    const overdue = tasks.filter(isTaskOverdue).length;
    const level = getLevelInfo(stats.xp);

    setText("[data-active-count]", active);
    setText("[data-completed-count]", completed);
    setText("[data-overdue-count]", overdue);
    setText("[data-streak-count]", stats.streak);
    setText("[data-streak-mini]", stats.streak);
    setText("[data-xp-total]", stats.xp);
    setText("[data-rank-name]", level.rank);
    setText("[data-level-number]", `Level ${level.level}`);
    setText("[data-xp-next]", Math.max(0, level.toNext));
    $$(".xp-bar span, [data-xp-bar]").forEach(el => {
      el.style.width = `${level.progress}%`;
    });
  }

  function setText(selector, text) {
    $$(selector).forEach(el => {
      el.textContent = text;
    });
  }

  function toggleTheme() {
    const settings = getSettings();
    saveSettings({ theme: settings.theme === "dark" ? "light" : "dark" });
    showToast("Theme updated", `TaskFlow is now in ${getSettings().theme} mode.`, "fa-circle-half-stroke");
  }

  function initQuickActions() {
    $$("[data-quick-add], [data-open-task-modal]").forEach(button => {
      button.addEventListener("click", () => openTaskModal());
    });
  }

  function initKeyboardShortcuts() {
    document.addEventListener("keydown", event => {
      if (event.key === "Escape") closeOpenModal();
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        openTaskModal();
      }
      if ((event.ctrlKey || event.metaKey) && event.key === "/") {
        event.preventDefault();
        $("#globalSearch")?.focus();
      }
    });
  }

  function initGlobalSearch() {
    $("#globalSearch")?.addEventListener("keydown", event => {
      if (event.key !== "Enter") return;
      const query = event.target.value.trim();
      if (!query) return;
      const pages = {
        dashboard: "dashboard.html",
        tasks: "tasks.html",
        planner: "planner.html",
        coach: "ai-coach.html",
        ai: "ai-coach.html",
        profile: "profile.html",
        settings: "settings.html",
        contact: "contact.html",
        about: "about.html"
      };
      const pageKey = Object.keys(pages).find(key => query.toLowerCase().includes(key));
      if (pageKey) {
        window.location.href = pages[pageKey];
      } else {
        window.location.href = `tasks.html?search=${encodeURIComponent(query)}`;
      }
    });
  }

  function initLiveClock() {
    const clock = $("#liveClock");
    const date = $("#liveDate");
    if (!clock || !date) return;
    const update = () => {
      const now = new Date();
      clock.textContent = now.toLocaleTimeString("en-AU", { hour: "2-digit", minute: "2-digit" });
      date.textContent = now.toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long" });
    };
    update();
    window.setInterval(update, 1000);
  }

  function initNotifications() {
    const button = $("[data-toggle-notifications]");
    const panel = $("[data-notification-panel]");
    if (!button || !panel) return;
    renderNotifications();
    button.addEventListener("click", event => {
      event.stopPropagation();
      panel.classList.toggle("open");
      renderNotifications();
    });
    document.addEventListener("click", event => {
      if (!panel.contains(event.target) && !button.contains(event.target)) {
        panel.classList.remove("open");
      }
    });
  }

  function buildNotifications() {
    const settings = getSettings();
    const tasks = getTasks();
    const stats = getStats();
    const notifications = [];
    if (settings.reminders) {
      tasks.filter(task => !task.completed).forEach(task => {
        const due = daysUntil(task.dueDate);
        if (due < 0) {
          notifications.push({ id: `overdue-${task.id}-${task.dueDate}`, icon: "fa-clock", title: "Overdue alert", body: `${task.title} was due ${formatDate(task.dueDate)}.` });
        } else if (due <= 2) {
          notifications.push({ id: `due-${task.id}-${task.dueDate}`, icon: "fa-bell", title: "Upcoming reminder", body: `${task.title} is due ${formatDate(task.dueDate)}.` });
        }
      });
    }
    ACHIEVEMENTS.filter(item => stats.achievements.includes(item.id)).slice(-3).forEach(item => {
      notifications.push({ id: `ach-${item.id}`, icon: item.icon, title: "Achievement unlocked", body: `${item.title}: ${item.desc}` });
    });
    if (!notifications.length) {
      notifications.push({ id: "clear-day", icon: "fa-star", title: "Clear dashboard", body: "No urgent reminders right now. Keep building your streak." });
    }
    return notifications;
  }

  function renderNotifications() {
    const notifications = buildNotifications();
    const read = readJSON(KEYS.readNotifications, []);
    const unread = notifications.filter(item => !read.includes(item.id)).length;
    setText("[data-notification-count]", unread);
    const panel = $("[data-notification-panel]");
    if (!panel) return;
    panel.innerHTML = `
      <div class="notification-head">
        <h3>Notifications</h3>
        <button class="text-link" type="button" data-mark-notifications>Mark read</button>
      </div>
      ${notifications.map(item => `
        <article class="notification-item">
          <i class="fa-solid ${escapeHTML(item.icon)}"></i>
          <div>
            <strong>${escapeHTML(item.title)}</strong>
            <span>${escapeHTML(item.body)}</span>
          </div>
        </article>
      `).join("")}
    `;
    $("[data-mark-notifications]", panel)?.addEventListener("click", () => {
      writeJSON(KEYS.readNotifications, notifications.map(item => item.id));
      renderNotifications();
      showToast("Notifications cleared", "All current reminders are marked as read.", "fa-circle-check");
    });
  }

  function daysUntil(dateString) {
    const today = new Date(`${todayISO()}T00:00:00`);
    const due = new Date(`${dateString}T00:00:00`);
    return Math.floor((due - today) / 86400000);
  }

  function isTaskOverdue(task) {
    return !task.completed && daysUntil(task.dueDate) < 0;
  }

  function initOnboarding() {
    const settings = getSettings();
    if (settings.onboarded) return;
    const overlay = document.createElement("div");
    overlay.className = "modal-backdrop open onboarding";
    overlay.innerHTML = `
      <div class="task-modal glass-card onboarding-card">
        <div class="modal-header">
          <h2>Welcome to TaskFlow</h2>
          <button class="icon-button" type="button" data-onboarding-close aria-label="Close"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <div class="onboarding-steps">
          <article class="active" data-step="0"><i class="fa-solid fa-list-check"></i><h3>Capture tasks</h3><p>Add homework, chores, school and personal work with priorities and due dates.</p></article>
          <article data-step="1"><i class="fa-solid fa-calendar-week"></i><h3>Plan your week</h3><p>Drag tasks into days and build a realistic weekly schedule.</p></article>
          <article data-step="2"><i class="fa-solid fa-trophy"></i><h3>Build your streak</h3><p>Complete tasks to earn XP, ranks, badges and momentum.</p></article>
        </div>
        <div class="button-row">
          <button class="button primary" type="button" data-onboarding-next>Next</button>
          <button class="button ghost" type="button" data-onboarding-close>Skip</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    let step = 0;
    const close = () => {
      saveSettings({ onboarded: true });
      overlay.remove();
    };
    overlay.addEventListener("click", event => {
      if (event.target === overlay || event.target.closest("[data-onboarding-close]")) close();
      if (event.target.closest("[data-onboarding-next]")) {
        step += 1;
        if (step > 2) {
          close();
          return;
        }
        $$(".onboarding-steps article", overlay).forEach(item => item.classList.toggle("active", Number(item.dataset.step) === step));
        $("[data-onboarding-next]", overlay).textContent = step === 2 ? "Finish" : "Next";
      }
    });
  }

  function initTaskModal() {
    populateTaskOptions();
    $("#taskForm")?.addEventListener("submit", saveTaskFromForm);
    $$("[data-close-modal]").forEach(button => button.addEventListener("click", closeOpenModal));
    $$(".modal-backdrop").forEach(backdrop => {
      backdrop.addEventListener("click", event => {
        if (event.target === backdrop) closeOpenModal();
      });
    });
  }

  function populateTaskOptions() {
    const select = $("#taskCategory");
    if (!select) return;
    select.innerHTML = Object.keys(CATEGORIES).map(category => `<option>${category}</option>`).join("");
  }

  function openTaskModal(task = null) {
    const modal = $('[data-modal="taskModal"]');
    if (!modal || !$("#taskForm")) return;
    populateTaskOptions();
    $("#taskForm").reset();
    $("#taskId").value = task?.id || "";
    $("#taskTitle").value = task?.title || "";
    $("#taskCategory").value = task?.category || "Homework";
    $("#taskPriority").value = task?.priority || "Medium";
    $("#taskDueDate").value = task?.dueDate || todayISO();
    $("#taskRepeat").value = task?.repeat || "None";
    $("#taskProgress").value = task?.progress ?? 0;
    $("#taskNotes").value = task?.notes || "";
    $("[data-task-modal-title]").textContent = task ? "Edit task" : "Add task";
    modal.classList.add("open");
    modal.setAttribute("aria-hidden", "false");
    $("#taskTitle").focus();
  }

  function closeOpenModal() {
    $$(".modal-backdrop.open").forEach(modal => {
      modal.classList.remove("open");
      modal.setAttribute("aria-hidden", "true");
    });
  }

  function saveTaskFromForm(event) {
    event.preventDefault();
    const title = $("#taskTitle").value.trim();
    const dueDate = $("#taskDueDate").value;
    if (!title || !dueDate) {
      showToast("Task needs details", "Add a title and due date before saving.", "fa-circle-exclamation");
      return;
    }
    const tasks = getTasks();
    const id = $("#taskId").value;
    const payload = {
      title,
      category: $("#taskCategory").value,
      priority: $("#taskPriority").value,
      dueDate,
      repeat: $("#taskRepeat").value,
      progress: Number($("#taskProgress").value),
      notes: $("#taskNotes").value.trim(),
      updatedAt: new Date().toISOString()
    };
    if (id) {
      const index = tasks.findIndex(task => task.id === id);
      if (index !== -1) {
        tasks[index] = { ...tasks[index], ...payload };
      }
      showToast("Task updated", `${title} is saved.`, "fa-floppy-disk");
    } else {
      tasks.unshift({
        id: createId("task"),
        ...payload,
        completed: false,
        createdAt: new Date().toISOString()
      });
      showToast("Task added", `${title} is now in your workspace.`, "fa-plus");
    }
    saveTasks(tasks);
    closeOpenModal();
    renderGlobalStats();
    renderNotifications();
    if (document.body.dataset.page === "tasks") renderTasks();
    if (document.body.dataset.page === "planner") renderPlanner();
    if (document.body.dataset.page === "dashboard") initDashboardPage();
  }

  function completeTask(taskId) {
    const tasks = getTasks();
    const task = tasks.find(item => item.id === taskId);
    if (!task) return;
    const wasCompleted = task.completed;
    task.completed = !task.completed;
    task.progress = task.completed ? 100 : Math.min(task.progress, 90);
    saveTasks(tasks);

    if (!wasCompleted && task.completed) {
      const stats = getStats();
      const xpGain = { Low: 35, Medium: 55, High: 80, Urgent: 110 }[task.priority] || 55;
      stats.xp += xpGain;
      stats.streak += 1;
      stats.bestStreak = Math.max(stats.bestStreak || 0, stats.streak);
      stats.totalCompleted += 1;
      const weekday = (new Date().getDay() + 6) % 7;
      stats.weekly[weekday] = (stats.weekly[weekday] || 0) + 1;
      stats.heatmap.push(Math.min(4, Math.ceil(xpGain / 30)));
      stats.heatmap = stats.heatmap.slice(-42);
      stats.streakHistory.push(stats.streak);
      stats.streakHistory = stats.streakHistory.slice(-14);
      checkAchievements(stats);
      saveStats(stats);
      runConfetti();
      showAchievement(`+${xpGain} XP`, `${task.title} completed. Streak increased.`);
    }

    renderGlobalStats();
    renderNotifications();
    if (document.body.dataset.page === "tasks") renderTasks();
    if (document.body.dataset.page === "dashboard") initDashboardPage();
  }

  function checkAchievements(stats) {
    const unlocked = stats.achievements || [];
    ACHIEVEMENTS.forEach(achievement => {
      if (!unlocked.includes(achievement.id) && achievement.test(stats)) {
        unlocked.push(achievement.id);
        if (getSettings().achievements) {
          showAchievement("Achievement unlocked", `${achievement.title}: ${achievement.desc}`);
        }
      }
    });
    stats.achievements = unlocked;
  }

  function deleteTask(taskId) {
    const tasks = getTasks();
    const task = tasks.find(item => item.id === taskId);
    if (!task) return;
    if (!window.confirm(`Delete "${task.title}"?`)) return;
    saveTasks(tasks.filter(item => item.id !== taskId));
    showToast("Task deleted", `${task.title} has been removed.`, "fa-trash");
    renderGlobalStats();
    renderNotifications();
    if (document.body.dataset.page === "tasks") renderTasks();
    if (document.body.dataset.page === "planner") renderPlanner();
  }

  function initTasksPage() {
    const urlSearch = new URLSearchParams(window.location.search).get("search");
    if (urlSearch && $("#taskSearch")) $("#taskSearch").value = urlSearch;
    ["taskSearch", "taskFilter", "taskSort"].forEach(id => {
      $(`#${id}`)?.addEventListener("input", renderTasks);
      $(`#${id}`)?.addEventListener("change", renderTasks);
    });
    $("[data-clear-completed]")?.addEventListener("click", () => {
      const tasks = getTasks();
      const remaining = tasks.filter(task => !task.completed);
      saveTasks(remaining);
      renderTasks();
      renderGlobalStats();
      showToast("Completed cleared", "Finished task cards were removed from the list.", "fa-broom");
    });
    renderTasks();
  }

  function renderTasks() {
    const list = $("#taskList");
    if (!list) return;
    let tasks = getTasks();
    const search = ($("#taskSearch")?.value || "").toLowerCase();
    const filter = $("#taskFilter")?.value || "all";
    const sort = $("#taskSort")?.value || "due-asc";

    if (search) {
      tasks = tasks.filter(task => [task.title, task.category, task.priority, task.notes].join(" ").toLowerCase().includes(search));
    }
    if (filter === "active") tasks = tasks.filter(task => !task.completed);
    else if (filter === "completed") tasks = tasks.filter(task => task.completed);
    else if (filter === "overdue") tasks = tasks.filter(isTaskOverdue);
    else if (filter !== "all") tasks = tasks.filter(task => task.category === filter);

    tasks.sort((a, b) => {
      if (sort === "priority") return priorityScore(b.priority) - priorityScore(a.priority);
      if (sort === "progress") return Number(b.progress) - Number(a.progress);
      if (sort === "title") return a.title.localeCompare(b.title);
      if (sort === "created") return new Date(b.createdAt) - new Date(a.createdAt);
      return new Date(`${a.dueDate}T00:00:00`) - new Date(`${b.dueDate}T00:00:00`);
    });

    if (!tasks.length) {
      list.innerHTML = `<div class="empty-state"><div><i class="fa-solid fa-magnifying-glass"></i><strong>No tasks found</strong><p>Add a new task or adjust your filters.</p></div></div>`;
      return;
    }

    list.innerHTML = tasks.map(task => taskCardHTML(task)).join("");
    $$("[data-complete-task]", list).forEach(button => {
      button.addEventListener("click", () => completeTask(button.dataset.completeTask));
    });
    $$("[data-edit-task]", list).forEach(button => {
      button.addEventListener("click", () => openTaskModal(getTasks().find(task => task.id === button.dataset.editTask)));
    });
    $$("[data-delete-task]", list).forEach(button => {
      button.addEventListener("click", () => deleteTask(button.dataset.deleteTask));
    });
  }

  function taskCardHTML(task) {
    const priorityColor = priorityColorFor(task.priority);
    return `
      <article class="task-card ${task.completed ? "completed" : ""}" style="--priority-color:${priorityColor}">
        <button class="task-check" type="button" data-complete-task="${task.id}" aria-label="Toggle ${escapeHTML(task.title)}">
          <i class="fa-solid ${task.completed ? "fa-check" : "fa-circle"}"></i>
        </button>
        <div>
          <h2 class="task-title">${escapeHTML(task.title)}</h2>
          <div class="task-meta">
            <span><i class="fa-solid fa-layer-group"></i>${escapeHTML(task.category)}</span>
            <span><i class="fa-solid fa-flag"></i>${escapeHTML(task.priority)}</span>
            <span><i class="fa-solid fa-calendar-day"></i>${formatDate(task.dueDate)}</span>
            <span><i class="fa-solid fa-repeat"></i>${escapeHTML(task.repeat)}</span>
          </div>
          ${task.notes ? `<p class="task-notes">${escapeHTML(task.notes)}</p>` : ""}
          <div class="task-progress">
            <div class="mini-progress"><span style="width:${Number(task.progress) || 0}%"></span></div>
            <small>${Number(task.progress) || 0}%</small>
          </div>
        </div>
        <div class="task-actions">
          <button class="icon-button" type="button" data-edit-task="${task.id}" aria-label="Edit task"><i class="fa-solid fa-pen"></i></button>
          <button class="icon-button" type="button" data-delete-task="${task.id}" aria-label="Delete task"><i class="fa-solid fa-trash"></i></button>
        </div>
      </article>
    `;
  }

  function priorityScore(priority) {
    return { Low: 1, Medium: 2, High: 3, Urgent: 4 }[priority] || 1;
  }

  function priorityColorFor(priority) {
    return { Low: "#10b981", Medium: "#06b6d4", High: "#f59e0b", Urgent: "#ef4444" }[priority] || "#7c3aed";
  }

  function initDashboardPage() {
    renderGlobalStats();
    renderDashboardChart();
    renderProgressCircles();
    renderUpcomingSchedule();
    renderMiniCalendar();
    renderQuote();
    renderHeatmap();
    initPomodoro();
    initMusicWidget();
    $("[data-refresh-chart]")?.addEventListener("click", () => {
      const stats = getStats();
      stats.weekly = stats.weekly.map(value => Math.max(1, value + Math.floor(Math.random() * 3) - 1));
      saveStats(stats);
      renderDashboardChart(true);
      showToast("Chart refreshed", "Weekly productivity data has been recalculated.", "fa-chart-line");
    });
    $("[data-new-quote]")?.addEventListener("click", renderQuote);
  }

  function renderDashboardChart(force = false) {
    const canvas = $("#productivityChart");
    if (!canvas) return;
    const stats = getStats();
    const data = stats.weekly || [1, 2, 3, 2, 4, 3, 5];
    if (window.taskflowChart && force) {
      window.taskflowChart.destroy();
      window.taskflowChart = null;
    }
    if (window.Chart) {
      if (window.taskflowChart) {
        window.taskflowChart.data.datasets[0].data = data;
        window.taskflowChart.update();
        return;
      }
      const gradient = canvas.getContext("2d").createLinearGradient(0, 0, 0, 240);
      gradient.addColorStop(0, "rgba(124, 58, 237, 0.45)");
      gradient.addColorStop(1, "rgba(6, 182, 212, 0.03)");
      window.taskflowChart = new Chart(canvas, {
        type: "line",
        data: {
          labels: SHORT_DAYS,
          datasets: [{
            label: "Productivity",
            data,
            fill: true,
            backgroundColor: gradient,
            borderColor: "#a855f7",
            pointBackgroundColor: "#06b6d4",
            tension: 0.42,
            borderWidth: 3
          }]
        },
        options: {
          responsive: true,
          plugins: { legend: { display: false } },
          scales: {
            y: { beginAtZero: true, grid: { color: "rgba(148, 163, 184, 0.16)" } },
            x: { grid: { display: false } }
          }
        }
      });
      return;
    }
    drawFallbackChart(canvas, data);
  }

  function drawFallbackChart(canvas, data) {
    const ctx = canvas.getContext("2d");
    const width = canvas.width = canvas.offsetWidth * devicePixelRatio;
    const height = canvas.height = 220 * devicePixelRatio;
    ctx.clearRect(0, 0, width, height);
    const max = Math.max(...data, 1);
    const gap = width / (data.length - 1 || 1);
    ctx.strokeStyle = "#a855f7";
    ctx.lineWidth = 4 * devicePixelRatio;
    ctx.beginPath();
    data.forEach((value, index) => {
      const x = index * gap;
      const y = height - (value / max) * (height - 30 * devicePixelRatio) - 15 * devicePixelRatio;
      if (index === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
  }

  function renderProgressCircles() {
    const tasks = getTasks();
    const completeRate = tasks.length ? Math.round((tasks.filter(task => task.completed).length / tasks.length) * 100) : 0;
    const stats = getStats();
    const values = {
      focus: Math.min(100, completeRate),
      habits: Math.min(100, stats.streak * 8),
      planning: Math.min(100, getPlanner().length * 12)
    };
    Object.entries(values).forEach(([key, value]) => {
      const circle = $(`[data-circle="${key}"]`);
      if (!circle) return;
      circle.style.setProperty("--value", `${value}%`);
      $("span", circle).textContent = `${value}%`;
    });
  }

  function renderUpcomingSchedule() {
    const container = $("[data-upcoming-schedule]");
    if (!container) return;
    const blocks = [...getPlanner()].sort((a, b) => DAYS.indexOf(a.day) - DAYS.indexOf(b.day) || a.time.localeCompare(b.time)).slice(0, 4);
    container.innerHTML = blocks.length ? blocks.map(block => `
      <article class="schedule-item">
        <time>${escapeHTML(block.time)}</time>
        <div>
          <strong>${escapeHTML(block.title)}</strong>
          <span>${escapeHTML(block.day)} · ${escapeHTML(block.category)} · ${escapeHTML(block.duration)}</span>
        </div>
      </article>
    `).join("") : `<div class="empty-state"><div><i class="fa-solid fa-calendar-plus"></i><strong>No blocks yet</strong><p>Add planner blocks to fill this panel.</p></div></div>`;
  }

  function renderMiniCalendar() {
    const calendar = $("#miniCalendar");
    if (!calendar) return;
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const first = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const startOffset = (first.getDay() + 6) % 7;
    const cells = SHORT_DAYS.map(day => `<span>${day}</span>`);
    for (let i = 0; i < startOffset; i += 1) cells.push("<span></span>");
    for (let day = 1; day <= daysInMonth; day += 1) {
      cells.push(`<span class="${day === now.getDate() ? "today" : ""}">${day}</span>`);
    }
    calendar.innerHTML = cells.join("");
  }

  function renderQuote() {
    const quote = $("#dailyQuote");
    if (!quote) return;
    quote.textContent = QUOTES[Math.floor(Math.random() * QUOTES.length)];
  }

  function renderHeatmap() {
    const container = $("[data-heatmap]");
    if (!container) return;
    const stats = getStats();
    const colors = ["rgba(124,58,237,0.10)", "rgba(124,58,237,0.26)", "rgba(124,58,237,0.45)", "rgba(6,182,212,0.62)", "rgba(16,185,129,0.76)"];
    container.innerHTML = (stats.heatmap || []).slice(-42).map(value => `<span style="--heat:${colors[value] || colors[0]}"></span>`).join("");
  }

  let timerInterval = null;
  let timerRemaining = 0;
  let timerRunning = false;

  function initPomodoro() {
    const display = $("[data-timer-display]");
    if (!display) return;
    const settings = getSettings();
    if (!timerRemaining) timerRemaining = settings.focusMinutes * 60;
    updateTimerDisplay();
    $("[data-timer-start]")?.addEventListener("click", startTimer);
    $("[data-timer-pause]")?.addEventListener("click", pauseTimer);
    $("[data-timer-reset]")?.addEventListener("click", resetTimer);
  }

  function startTimer() {
    if (timerRunning) return;
    timerRunning = true;
    timerInterval = window.setInterval(() => {
      timerRemaining -= 1;
      updateTimerDisplay();
      if (timerRemaining <= 0) {
        pauseTimer();
        timerRemaining = getSettings().breakMinutes * 60;
        const stats = getStats();
        stats.focusSessions += 1;
        stats.xp += 45;
        checkAchievements(stats);
        saveStats(stats);
        renderGlobalStats();
        runConfetti();
        showAchievement("Focus sprint complete", "+45 XP added. Take a short break.");
      }
    }, 1000);
  }

  function pauseTimer() {
    timerRunning = false;
    window.clearInterval(timerInterval);
  }

  function resetTimer() {
    pauseTimer();
    timerRemaining = getSettings().focusMinutes * 60;
    updateTimerDisplay();
  }

  function updateTimerDisplay() {
    const display = $("[data-timer-display]");
    if (!display) return;
    const minutes = Math.floor(timerRemaining / 60).toString().padStart(2, "0");
    const seconds = Math.floor(timerRemaining % 60).toString().padStart(2, "0");
    display.textContent = `${minutes}:${seconds}`;
  }

  let audioContext = null;
  let audioNodes = null;

  function initMusicWidget() {
    const button = $("[data-music-toggle]");
    if (!button) return;
    button.addEventListener("click", () => {
      if (audioNodes) {
        stopFocusAudio();
        $("i", button).className = "fa-solid fa-play";
        showToast("Music paused", "Focus ambience stopped.", "fa-volume-xmark");
      } else {
        startFocusAudio();
        $("i", button).className = "fa-solid fa-pause";
        showToast("Music playing", "Soft focus ambience is active.", "fa-music");
      }
    });
    $("[data-music-volume]")?.addEventListener("input", event => {
      if (audioNodes) audioNodes.gain.gain.value = Number(event.target.value) / 900;
    });
  }

  function startFocusAudio() {
    audioContext = audioContext || new (window.AudioContext || window.webkitAudioContext)();
    const gain = audioContext.createGain();
    const oscA = audioContext.createOscillator();
    const oscB = audioContext.createOscillator();
    oscA.frequency.value = 196;
    oscB.frequency.value = 246.94;
    oscA.type = "sine";
    oscB.type = "triangle";
    gain.gain.value = Number($("[data-music-volume]")?.value || 42) / 900;
    oscA.connect(gain);
    oscB.connect(gain);
    gain.connect(audioContext.destination);
    oscA.start();
    oscB.start();
    audioNodes = { oscA, oscB, gain };
  }

  function stopFocusAudio() {
    if (!audioNodes) return;
    audioNodes.oscA.stop();
    audioNodes.oscB.stop();
    audioNodes = null;
  }

  function initPlannerPage() {
    populatePlannerOptions();
    $("#planForm")?.addEventListener("submit", savePlanFromForm);
    $("[data-add-plan-block]")?.addEventListener("click", () => openPlanModal());
    renderPlanner();
  }

  function populatePlannerOptions() {
    if ($("#planDay")) $("#planDay").innerHTML = DAYS.map(day => `<option>${day}</option>`).join("");
    if ($("#planCategory")) $("#planCategory").innerHTML = Object.keys(CATEGORIES).map(category => `<option>${category}</option>`).join("");
  }

  function renderPlanner() {
    renderPlannerSource();
    renderWeeklyBoard();
    renderGlobalStats();
  }

  function renderPlannerSource() {
    const source = $("#plannerTaskSource");
    if (!source) return;
    const tasks = getTasks().filter(task => !task.completed);
    source.innerHTML = tasks.length ? tasks.map(task => `
      <article class="planner-task" draggable="true" data-drag-task="${task.id}">
        <strong>${escapeHTML(task.title)}</strong>
        <span>${escapeHTML(task.category)} · due ${formatDate(task.dueDate)}</span>
      </article>
    `).join("") : `<div class="empty-state"><div><i class="fa-solid fa-circle-check"></i><strong>All clear</strong><p>No active tasks waiting for a day.</p></div></div>`;
    $$("[data-drag-task]", source).forEach(item => {
      item.addEventListener("dragstart", event => {
        event.dataTransfer.setData("application/json", JSON.stringify({ type: "task", id: item.dataset.dragTask }));
      });
    });
  }

  function renderWeeklyBoard() {
    const board = $("#weeklyBoard");
    if (!board) return;
    const planner = getPlanner();
    board.innerHTML = DAYS.map(day => {
      const blocks = planner
        .filter(block => block.day === day)
        .sort((a, b) => a.time.localeCompare(b.time));
      return `
        <section class="planner-day" data-day="${day}">
          <div class="planner-day-header">
            <h2>${day}</h2>
            <span>${blocks.length} blocks</span>
          </div>
          <div class="time-ruler">
            ${blocks.map(block => planBlockHTML(block)).join("") || `<div class="empty-state"><div><i class="fa-solid fa-plus"></i><strong>Drop tasks here</strong></div></div>`}
          </div>
        </section>
      `;
    }).join("");

    $$(".planner-day", board).forEach(dayEl => {
      dayEl.addEventListener("dragover", event => {
        event.preventDefault();
        dayEl.classList.add("drag-over");
      });
      dayEl.addEventListener("dragleave", () => dayEl.classList.remove("drag-over"));
      dayEl.addEventListener("drop", event => {
        event.preventDefault();
        dayEl.classList.remove("drag-over");
        const payload = JSON.parse(event.dataTransfer.getData("application/json") || "{}");
        const day = dayEl.dataset.day;
        if (payload.type === "task") addTaskToPlanner(payload.id, day);
        if (payload.type === "plan") movePlanBlock(payload.id, day);
      });
    });

    $$("[data-drag-plan]", board).forEach(block => {
      block.addEventListener("dragstart", event => {
        event.dataTransfer.setData("application/json", JSON.stringify({ type: "plan", id: block.dataset.dragPlan }));
      });
    });
    $$("[data-edit-plan]", board).forEach(button => button.addEventListener("click", () => {
      openPlanModal(getPlanner().find(block => block.id === button.dataset.editPlan));
    }));
    $$("[data-delete-plan]", board).forEach(button => button.addEventListener("click", () => deletePlan(button.dataset.deletePlan)));
  }

  function planBlockHTML(block) {
    return `
      <article class="plan-block" draggable="true" data-drag-plan="${block.id}" style="--category-color:${CATEGORIES[block.category] || "#7c3aed"}">
        <time>${escapeHTML(block.time)} · ${escapeHTML(block.duration)}</time>
        <strong>${escapeHTML(block.title)}</strong>
        <p>${escapeHTML(block.category)}${block.notes ? ` · ${escapeHTML(block.notes)}` : ""}</p>
        <div class="plan-actions">
          <button class="icon-button" type="button" data-edit-plan="${block.id}" aria-label="Edit block"><i class="fa-solid fa-pen"></i></button>
          <button class="icon-button" type="button" data-delete-plan="${block.id}" aria-label="Delete block"><i class="fa-solid fa-trash"></i></button>
        </div>
      </article>
    `;
  }

  function addTaskToPlanner(taskId, day) {
    const task = getTasks().find(item => item.id === taskId);
    if (!task) return;
    const planner = getPlanner();
    planner.push({
      id: createId("plan"),
      title: task.title,
      day,
      time: "16:00",
      duration: "45 min",
      category: task.category,
      notes: task.notes || `Priority: ${task.priority}`
    });
    savePlanner(planner);
    const stats = getStats();
    stats.plannerBlocks = planner.length;
    checkAchievements(stats);
    saveStats(stats);
    renderPlanner();
    showToast("Added to planner", `${task.title} was placed on ${day}.`, "fa-calendar-plus");
  }

  function movePlanBlock(blockId, day) {
    const planner = getPlanner();
    const block = planner.find(item => item.id === blockId);
    if (!block) return;
    block.day = day;
    savePlanner(planner);
    renderPlanner();
    showToast("Planner updated", `${block.title} moved to ${day}.`, "fa-calendar-days");
  }

  function openPlanModal(block = null) {
    const modal = $('[data-modal="planModal"]');
    if (!modal) return;
    populatePlannerOptions();
    $("#planForm").reset();
    $("#planId").value = block?.id || "";
    $("#planTitle").value = block?.title || "";
    $("#planDay").value = block?.day || "Monday";
    $("#planCategory").value = block?.category || "Homework";
    $("#planTime").value = block?.time || "16:00";
    $("#planDuration").value = block?.duration || "45 min";
    $("#planNotes").value = block?.notes || "";
    $("[data-plan-modal-title]").textContent = block ? "Edit planner block" : "Add planner block";
    modal.classList.add("open");
    modal.setAttribute("aria-hidden", "false");
    $("#planTitle").focus();
  }

  function savePlanFromForm(event) {
    event.preventDefault();
    const title = $("#planTitle").value.trim();
    if (!title) {
      showToast("Planner needs a title", "Add a title before saving the block.", "fa-circle-exclamation");
      return;
    }
    const planner = getPlanner();
    const id = $("#planId").value;
    const payload = {
      title,
      day: $("#planDay").value,
      category: $("#planCategory").value,
      time: $("#planTime").value,
      duration: $("#planDuration").value,
      notes: $("#planNotes").value.trim()
    };
    if (id) {
      const index = planner.findIndex(block => block.id === id);
      if (index !== -1) planner[index] = { ...planner[index], ...payload };
    } else {
      planner.push({ id: createId("plan"), ...payload });
    }
    savePlanner(planner);
    const stats = getStats();
    stats.plannerBlocks = planner.length;
    checkAchievements(stats);
    saveStats(stats);
    closeOpenModal();
    renderPlanner();
    showToast("Planner saved", `${title} is now scheduled.`, "fa-floppy-disk");
  }

  function deletePlan(blockId) {
    const planner = getPlanner();
    const block = planner.find(item => item.id === blockId);
    if (!block) return;
    if (!window.confirm(`Delete planner block "${block.title}"?`)) return;
    const next = planner.filter(item => item.id !== blockId);
    savePlanner(next);
    const stats = getStats();
    stats.plannerBlocks = next.length;
    saveStats(stats);
    renderPlanner();
    showToast("Block deleted", `${block.title} was removed from your week.`, "fa-trash");
  }

  function initCoachPage() {
    const form = $("#chatForm");
    const input = $("#chatInput");
    if (!form || !input) return;
    renderChat();
    form.addEventListener("submit", event => {
      event.preventDefault();
      sendCoachMessage(input.value.trim());
      input.value = "";
    });
    $$("[data-prompt]").forEach(button => button.addEventListener("click", () => sendCoachMessage(button.dataset.prompt)));
    $("[data-voice-input]")?.addEventListener("click", startVoiceInput);
  }

  function chatKey() {
    return userStorageKey("chat");
  }

  function getChat() {
    const chat = readJSON(chatKey(), []);
    if (chat.length) return chat;
    return [{ role: "ai", text: "Hey Harvey. I am TaskFlow Coach. Ask me about study techniques, homework, exams, time management, motivation or organisation." }];
  }

  function saveChat(chat) {
    writeJSON(chatKey(), chat.slice(-40));
  }

  function renderChat() {
    const windowEl = $("#chatWindow");
    if (!windowEl) return;
    windowEl.innerHTML = getChat().map(message => chatMessageHTML(message)).join("");
    windowEl.scrollTop = windowEl.scrollHeight;
  }

  function chatMessageHTML(message) {
    return `
      <div class="chat-message ${message.role === "user" ? "user" : "ai"}">
        <div class="chat-bubble">${formatCoachText(message.text)}</div>
      </div>
    `;
  }

  function formatCoachText(text) {
    return escapeHTML(text).replace(/\n/g, "<br>");
  }

  function sendCoachMessage(text) {
    if (!text) return;
    const chat = getChat();
    chat.push({ role: "user", text });
    saveChat(chat);
    renderChat();
    showTyping();
    window.setTimeout(() => {
      const next = getChat();
      next.push({ role: "ai", text: generateCoachResponse(text) });
      saveChat(next);
      renderChat();
    }, 850 + Math.random() * 500);
  }

  function showTyping() {
    const windowEl = $("#chatWindow");
    if (!windowEl) return;
    windowEl.insertAdjacentHTML("beforeend", `
      <div class="chat-message ai" data-typing>
        <div class="chat-bubble"><span class="typing-dots"><span></span><span></span><span></span></span></div>
      </div>
    `);
    windowEl.scrollTop = windowEl.scrollHeight;
  }

  function generateCoachResponse(input) {
    const text = input.toLowerCase();
    if (/(study|studying|learn|remember|better)/.test(text)) {
      return "Use a 3-part study loop:\n1. Pomodoro: 25 minutes focused, 5 minutes reset.\n2. Active recall: close your notes and answer from memory.\n3. Spaced repetition: revisit the topic tomorrow, then in three days.\nEnd each session by writing the one thing you still do not understand.";
    }
    if (/(procrastinate|procrastination|lazy|distracted|delay)/.test(text)) {
      return "Procrastination usually means the task feels too big or too vague. Shrink it until it is impossible to refuse: open the document, write one heading, or solve one question. Set a 10-minute timer. Momentum matters more than mood.";
    }
    if (/(exam|test|quiz|assessment)/.test(text)) {
      return "Exam prep plan:\n1. List the topics from hardest to easiest.\n2. Do timed practice questions before rereading notes.\n3. Mark mistakes and turn them into flashcards.\n4. Sleep properly the night before. A tired brain leaks marks.";
    }
    if (/(time|schedule|manage|planner|plan)/.test(text)) {
      return "Time management works best when your calendar is honest. Put fixed commitments first, then add 45-60 minute study blocks. Leave buffer time. If your plan has no breaks, it is not a plan; it is a wish.";
    }
    if (/(homework|assignment|task)/.test(text)) {
      return "For homework, use the 4-step TaskFlow method: clarify the outcome, split it into checkpoints, set the due date, then schedule the first checkpoint in your weekly planner. Start with the part that reduces the most uncertainty.";
    }
    if (/(motivat|tired|burnout|give up|streak)/.test(text)) {
      return "Motivation rises after progress, not before it. Choose one visible win and make it small enough to finish today. Protect your streak, but do not punish yourself for being human. Reset fast and keep moving.";
    }
    if (/(organise|organize|mess|notes|folder)/.test(text)) {
      return "Organisation system: one task list, one weekly planner, one notes folder per subject. Every task needs a verb, a date and a category. If it is floating in your head, capture it before it steals focus.";
    }
    return "I would turn that into a clear next action: define the outcome, pick a 25-minute focus block, remove one distraction and finish the smallest meaningful piece. Then log it in TaskFlow so your XP and streak keep moving.";
  }

  function startVoiceInput() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      showToast("Voice unavailable", "This browser does not support speech recognition.", "fa-microphone-slash");
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = "en-AU";
    recognition.interimResults = false;
    recognition.onresult = event => {
      $("#chatInput").value = event.results[0][0].transcript;
      $("#chatInput").focus();
    };
    recognition.start();
    showToast("Listening", "Speak your study question.", "fa-microphone");
  }

  function initProfilePage() {
    const profile = getProfile();
    $("#profileName").value = profile.name || "";
    $("#profileEmail").value = profile.email || "";
    $("#profileSchool").value = profile.school || "Blacktown Boys High School";
    $("#profileNameDisplay").textContent = profile.name || "Harvey";
    $("#profileEmailDisplay").textContent = profile.email || "harvey@student.com";
    $("#profileAvatar").src = profile.avatar || "assets/avatar.svg";
    renderStreakHistory();
    renderBadges();

    $("#profileForm")?.addEventListener("submit", event => {
      event.preventDefault();
      const oldEmail = getCurrentUser().email;
      const nextProfile = {
        ...getProfile(),
        name: $("#profileName").value.trim() || "Harvey",
        email: $("#profileEmail").value.trim().toLowerCase() || oldEmail,
        school: $("#profileSchool").value.trim() || "Blacktown Boys High School"
      };
      if (!isValidEmail(nextProfile.email)) {
        showToast("Invalid email", "Enter a valid profile email.", "fa-circle-exclamation");
        return;
      }
      if (nextProfile.email !== oldEmail) migrateEmailData(oldEmail, nextProfile.email);
      saveProfile(nextProfile);
      setCurrentUser({ name: nextProfile.name, email: nextProfile.email });
      updateUserList(nextProfile.name, nextProfile.email, oldEmail);
      renderGlobalUser();
      initProfilePage();
      showToast("Profile saved", "Your TaskFlow identity has been updated.", "fa-user-check");
    });

    $("#avatarInput")?.addEventListener("change", event => {
      const file = event.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const next = { ...getProfile(), avatar: reader.result };
        saveProfile(next);
        renderGlobalUser();
        initProfilePage();
        showToast("Avatar updated", "Your profile picture was saved locally.", "fa-camera");
      };
      reader.readAsDataURL(file);
    });
  }

  function migrateEmailData(oldEmail, newEmail) {
    ["tasks", "stats", "planner", "profile", "chat"].forEach(type => {
      const oldKey = userStorageKey(type, oldEmail);
      const newKey = userStorageKey(type, newEmail);
      const value = localStorage.getItem(oldKey);
      if (value && !localStorage.getItem(newKey)) localStorage.setItem(newKey, value);
      if (value) localStorage.removeItem(oldKey);
    });
  }

  function updateUserList(name, email, oldEmail) {
    const users = readJSON(KEYS.users, []);
    const existing = users.find(user => user.email === oldEmail || user.email === email);
    if (existing) {
      existing.name = name;
      existing.email = email;
    } else {
      users.push({ name, email, password: "Taskflow10", createdAt: new Date().toISOString() });
    }
    writeJSON(KEYS.users, users);
  }

  function renderStreakHistory() {
    const container = $("#streakHistory");
    if (!container) return;
    const stats = getStats();
    const history = stats.streakHistory || [];
    const max = Math.max(...history, 1);
    container.innerHTML = history.map(value => `<span style="height:${Math.max(16, (value / max) * 100)}px" title="${value} streak points"></span>`).join("");
  }

  function renderBadges() {
    const grid = $("#badgeGrid");
    if (!grid) return;
    const stats = getStats();
    grid.innerHTML = ACHIEVEMENTS.map(item => {
      const unlocked = stats.achievements.includes(item.id);
      return `
        <article class="badge ${unlocked ? "" : "locked"}">
          <i class="fa-solid ${item.icon}"></i>
          <strong>${escapeHTML(item.title)}</strong>
          <span>${escapeHTML(unlocked ? "Unlocked" : item.desc)}</span>
        </article>
      `;
    }).join("");
  }

  function initContactPage() {
    $("#contactForm")?.addEventListener("submit", event => {
      event.preventDefault();
      const values = ["contactName", "contactEmail", "contactSubject", "contactMessage"].map(id => $(`#${id}`).value.trim());
      if (!values.every(Boolean) || !isValidEmail(values[1])) {
        showToast("Check contact form", "Add your name, valid email, subject and message.", "fa-circle-exclamation");
        return;
      }
      const button = $(".animated-submit");
      button.classList.add("submitting");
      $("span", button).textContent = "Sending...";
      window.setTimeout(() => {
        button.classList.remove("submitting");
        $("span", button).textContent = "Send message";
        $("#contactForm").reset();
        showToast("Message sent", "Your TaskFlow contact message was saved locally.", "fa-paper-plane");
      }, 850);
    });
  }

  function initAboutPage() {
    $$("[data-count-up]").forEach(counter => {
      const target = Number(counter.dataset.countUp);
      let current = 0;
      const step = Math.max(1, Math.ceil(target / 36));
      const interval = window.setInterval(() => {
        current += step;
        counter.textContent = Math.min(target, current);
        if (current >= target) window.clearInterval(interval);
      }, 28);
    });
  }

  function initSettingsPage() {
    const settings = getSettings();
    $("#darkModeSetting").checked = settings.theme === "dark";
    $("#motionSetting").checked = settings.motion;
    $("#reminderSetting").checked = settings.reminders;
    $("#achievementSetting").checked = settings.achievements;
    $("#focusMinutes").value = settings.focusMinutes;
    $("#breakMinutes").value = settings.breakMinutes;

    $("#darkModeSetting")?.addEventListener("change", event => saveSettings({ theme: event.target.checked ? "dark" : "light" }));
    $("[data-save-settings]")?.addEventListener("click", () => {
      saveSettings({
        motion: $("#motionSetting").checked,
        reminders: $("#reminderSetting").checked,
        achievements: $("#achievementSetting").checked,
        focusMinutes: clamp(Number($("#focusMinutes").value), 5, 90),
        breakMinutes: clamp(Number($("#breakMinutes").value), 1, 30)
      });
      resetTimer();
      renderNotifications();
      showToast("Settings saved", "Your TaskFlow preferences are updated.", "fa-gear");
    });
    $("[data-export-data]")?.addEventListener("click", exportData);
    $("[data-reset-data]")?.addEventListener("click", resetDemoData);
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value || min));
  }

  function exportData() {
    const user = getCurrentUser();
    const data = {
      user,
      profile: getProfile(),
      tasks: getTasks(),
      planner: getPlanner(),
      stats: getStats(),
      settings: getSettings(),
      exportedAt: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "taskflow-data.json";
    anchor.click();
    URL.revokeObjectURL(url);
    showToast("Data exported", "Your local TaskFlow data download has started.", "fa-file-export");
  }

  function resetDemoData() {
    if (!window.confirm("Reset tasks, planner and stats for this profile?")) return;
    const email = getCurrentUser().email;
    localStorage.removeItem(userStorageKey("tasks", email));
    localStorage.removeItem(userStorageKey("stats", email));
    localStorage.removeItem(userStorageKey("planner", email));
    ensureUserData(email);
    renderGlobalStats();
    renderNotifications();
    showToast("Demo reset", "Fresh TaskFlow sample data has been restored.", "fa-rotate-left");
  }

  function logout() {
    localStorage.removeItem(KEYS.currentUser);
    showToast("Logged out", "Returning to the TaskFlow login page.", "fa-right-from-bracket");
    window.setTimeout(() => {
      window.location.href = "login.html";
    }, 450);
  }

  function showToast(title, body, icon = "fa-circle-info") {
    let region = $(".toast-region");
    if (!region) {
      region = document.createElement("div");
      region.className = "toast-region";
      document.body.appendChild(region);
    }
    const toast = document.createElement("article");
    toast.className = "toast";
    const iconClass = /\bfa-(solid|regular|brands)\b/.test(icon) ? icon : `fa-solid ${icon}`;
    toast.innerHTML = `
      <i class="${iconClass}"></i>
      <div><strong>${escapeHTML(title)}</strong><span>${escapeHTML(body)}</span></div>
      <button type="button" aria-label="Dismiss"><i class="fa-solid fa-xmark"></i></button>
    `;
    region.appendChild(toast);
    $("button", toast).addEventListener("click", () => toast.remove());
    window.setTimeout(() => toast.remove(), 4300);
  }

  function showAchievement(title, body) {
    const popup = $("[data-achievement-popup]");
    if (!popup || !getSettings().achievements) {
      showToast(title, body, "fa-trophy");
      return;
    }
    popup.innerHTML = `<strong><i class="fa-solid fa-trophy"></i> ${escapeHTML(title)}</strong><p>${escapeHTML(body)}</p>`;
    popup.classList.add("show");
    window.setTimeout(() => popup.classList.remove("show"), 3200);
  }

  function runConfetti() {
    const colors = ["#7c3aed", "#a855f7", "#06b6d4", "#10b981", "#f59e0b"];
    for (let i = 0; i < 42; i += 1) {
      const piece = document.createElement("span");
      piece.className = "confetti-piece";
      piece.style.left = `${Math.random() * 100}vw`;
      piece.style.background = colors[i % colors.length];
      piece.style.setProperty("--x", `${Math.random() * 160 - 80}px`);
      piece.style.animationDelay = `${Math.random() * 180}ms`;
      document.body.appendChild(piece);
      window.setTimeout(() => piece.remove(), 1500);
    }
  }
})();
