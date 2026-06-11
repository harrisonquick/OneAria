const app = document.querySelector("#app");

const state = {
  people: [],
  orgUnits: [],
  badges: [],
  selectedId: "person-avery-stone",
  query: "",
  availability: "all",
  tab: "profile",
};

const statusCopy = {
  available: "Available",
  busy: "Busy",
  "out-of-office": "Out of office",
};

const statusIcon = {
  available: "check-circle-2",
  busy: "clock-3",
  "out-of-office": "plane",
};

async function bootstrap() {
  try {
    const response = await fetch("./data/ariaPeopleSeed.json");
    if (!response.ok) {
      throw new Error(`Seed data request failed: ${response.status}`);
    }
    const seed = await response.json();
    state.people = seed.people;
    state.orgUnits = seed.orgUnits;
    state.badges = seed.badgeCatalog;
    render();
  } catch (error) {
    app.innerHTML = `
      <main class="error-state">
        <div class="error-panel">
          <p class="eyebrow">Aria People 2.0</p>
          <h1>Could not load the seed data.</h1>
          <p>Start a local web server from the repo root and open the local URL.</p>
          <code>python3 -m http.server 5173</code>
        </div>
      </main>
    `;
    console.error(error);
  }
}

function render() {
  const selected = getSelectedPerson();
  const people = getVisiblePeople();
  const managerTrail = getManagerTrail(selected);
  const reports = selected.directReportIds.map(getPerson).filter(Boolean);
  const orgUnit = getOrgUnit(selected.orgUnitId);
  const selectedBadges = selected.badges.map(getBadge).filter(Boolean);

  app.innerHTML = `
    <header class="topbar">
      <a class="brand" href="#" data-home>
        <span class="brand-mark">AP</span>
        <span>
          <strong>Aria</strong>
          <span>People 2.0</span>
        </span>
      </a>
      <div class="global-search">
        <i data-lucide="search"></i>
        <input
          id="global-search"
          type="search"
          value="${escapeAttribute(state.query)}"
          placeholder="Search people, roles, teams, tags"
          autocomplete="off"
        />
      </div>
      <div class="topbar-actions">
        <button class="icon-button" type="button" data-action="copy-email" title="Copy email">
          <i data-lucide="mail"></i>
        </button>
        <button class="icon-button" type="button" data-action="download-vcard" title="Download contact">
          <i data-lucide="download"></i>
        </button>
      </div>
    </header>

    <div class="workspace">
      <aside class="people-rail" aria-label="People">
        <div class="rail-summary">
          <span>${state.people.length}</span>
          <span>people</span>
        </div>
        <div class="segmented" role="tablist" aria-label="Availability filter">
          ${filterButton("all", "All")}
          ${filterButton("available", "Available")}
          ${filterButton("out-of-office", "OOO")}
        </div>
        <div class="people-list">
          ${people.map(personListItem).join("")}
        </div>
      </aside>

      <main class="profile-page">
        <nav class="org-strip" aria-label="Organization path">
          ${managerTrail.map(orgCrumb).join("")}
          ${orgCrumb(selected, true)}
        </nav>

        <section class="profile-hero">
          <div class="identity">
            ${avatar(selected, "avatar-xl")}
            <div class="identity-copy">
              <p class="eyebrow">${escapeHtml(selected.globalUid)} / ${escapeHtml(selected.department)}</p>
              <h1>${escapeHtml(selected.displayName)}</h1>
              <p>${escapeHtml(selected.title)}</p>
              <div class="identity-meta">
                <span><i data-lucide="map-pin"></i>${escapeHtml(selected.location.summary)}</span>
                <span><i data-lucide="${statusIcon[selected.availability.status]}"></i>${statusCopy[selected.availability.status]}</span>
                <span><i data-lucide="at-sign"></i>${escapeHtml(selected.permalink.replace("https://people.example.test/", ""))}</span>
              </div>
            </div>
          </div>
          <div class="hero-actions">
            ${actionButton("copy-email", "mail", "Email")}
            ${selected.contactActions.some((action) => action.type === "phone") ? actionButton("copy-phone", "phone", "Phone") : ""}
            ${actionButton("copy-slack", "message-square", "Slack")}
            ${selected.contactActions.some((action) => action.type === "video") ? actionButton("video", "video", "Video") : ""}
          </div>
        </section>

        <div class="tabs" role="tablist" aria-label="Profile views">
          ${tabButton("profile", "Profile", "user-round")}
          ${tabButton("org", "Org Chart", "network")}
          ${tabButton("badges", "Badges", "award")}
        </div>

        ${state.tab === "profile" ? profileView(selected, orgUnit, reports, selectedBadges) : ""}
        ${state.tab === "org" ? orgView(selected) : ""}
        ${state.tab === "badges" ? badgesView(selected, selectedBadges) : ""}
      </main>
    </div>

    <div id="toast" class="toast" role="status" aria-live="polite"></div>
  `;

  bindEvents();
  refreshIcons();
}

function profileView(selected, orgUnit, reports, selectedBadges) {
  return `
    <div class="profile-grid">
      <div class="main-column">
        ${section("About", "user-round", `
          <p class="about-copy">${escapeHtml(selected.about)}</p>
          ${selected.aboutPromptVisible ? emptyPrompt("Add About Text", "Take a moment to introduce yourself and share your role in the company.") : ""}
        `)}

        ${section("Organization", "building-2", `
          <div class="org-summary">
            <div>
              <span class="field-label">Organization</span>
              <strong>${escapeHtml(orgUnit?.name || selected.department)}</strong>
            </div>
            <div>
              <span class="field-label">Manager</span>
              ${managerLink(selected.managerId)}
            </div>
            <div>
              <span class="field-label">Direct reports</span>
              <strong>${reports.length}</strong>
            </div>
          </div>
          <div class="report-row">
            ${reports.length ? reports.map(reportCard).join("") : `<p class="muted">No direct reports</p>`}
          </div>
        `)}

        ${section("Badges and Patents", "award", `
          <div class="badge-row">
            ${selectedBadges.slice(0, 8).map(badgePill).join("")}
          </div>
          ${selectedBadges.length > 8 ? `<button class="text-button" type="button" data-tab="badges">View all ${selectedBadges.length} badges</button>` : ""}
          ${selected.patents.length ? `<div class="patents">${selected.patents.map(patentItem).join("")}</div>` : ""}
        `)}

        ${section("Links", "mouse-pointer-click", `
          ${selected.links.length ? `<div class="link-list">${selected.links.map(profileLink).join("")}</div>` : emptyPrompt("Add Links", "Looks like you have not added any links yet.")}
        `)}

        ${section("Tags", "tags", `
          ${selected.tags.length ? `<div class="tag-row">${selected.tags.map(tag).join("")}</div>` : emptyPrompt("Add Tags", "It only takes a moment to add tags to your profile.")}
        `)}

        ${section("Additional Information", "list-checks", `
          <dl class="info-grid">
            ${infoItem("Cost Center", selected.additionalInformation.costCenter)}
            ${infoItem("Legacy Organization", selected.additionalInformation.legacyOrganization)}
            ${infoItem("Legacy Cost Center", selected.additionalInformation.legacyCostCenter)}
            ${infoItem("Company Code", selected.additionalInformation.companyCode)}
            ${infoItem("Global UID", selected.globalUid)}
            ${infoItem("Job Title", selected.jobCodeTitle)}
            ${infoItem("Product Association", selected.additionalInformation.productAssociation)}
            ${infoItem("HR Representative", selected.additionalInformation.hrRepresentative || "-")}
            ${infoItem("HR Manager", selected.additionalInformation.hrManager)}
            ${infoItem("HR Address", selected.additionalInformation.hrAddress)}
            ${infoItem("Slack Workspaces", selected.additionalInformation.slackWorkspaces.join(", "))}
          </dl>
        `)}
      </div>

      <aside class="side-column">
        ${sidePanel("Contact Information", "contact-round", `
          <div class="contact-stack">
            ${contactLine("mail", "Email", selected.email)}
            ${contactLine("phone", "Mobile Phone", selected.mobilePhone)}
            ${contactLine("message-square", "Slack", selected.slackId)}
            ${contactLine("link", "Permalink", selected.permalink)}
            ${contactLine("users-round", "Pronouns", selected.pronouns)}
          </div>
          <button class="primary-button full-width" type="button" data-action="download-vcard">
            <i data-lucide="download"></i>
            Download Contact
          </button>
        `)}

        ${sidePanel("Location", "map-pinned", `
          <dl class="stacked-info">
            ${infoItem("Address", `${selected.location.address}, ${selected.location.city}, ${selected.location.state} ${selected.location.postalCode}, ${selected.location.country}`)}
            ${infoItem("Building", selected.location.building)}
            ${infoItem("Workspace", selected.location.workspaceType)}
            ${infoItem("Employee Time Zone", selected.location.timeZone)}
            ${infoItem("Employee Local Time", selected.location.localTimeDisplay)}
          </dl>
        `)}

        ${selected.availability.status === "out-of-office" ? sidePanel("Away Message", "plane", `
          <p class="away-copy">${escapeHtml(selected.availability.outOfOfficeMessage)}</p>
          <dl class="stacked-info compact">
            ${infoItem("Starts", selected.availability.outOfOfficeStart)}
            ${infoItem("Ends", selected.availability.outOfOfficeEnd)}
          </dl>
        `) : ""}
      </aside>
    </div>
  `;
}

function orgView(selected) {
  const roots = state.people.filter((person) => !person.managerId);
  return `
    <div class="org-layout">
      <section class="org-map" aria-label="Organization chart">
        ${roots.map((person) => orgNode(person, selected.id)).join("")}
      </section>
      <aside class="org-details">
        <p class="eyebrow">Selected Profile</p>
        <h2>${escapeHtml(selected.displayName)}</h2>
        <p>${escapeHtml(selected.title)}</p>
        <dl class="stacked-info">
          ${infoItem("Manager chain", getManagerTrail(selected).map((person) => person.displayName).join(" / ") || "Top of org")}
          ${infoItem("Direct reports", String(selected.directReportIds.length))}
          ${infoItem("Org unit", getOrgUnit(selected.orgUnitId)?.name || selected.department)}
          ${infoItem("Location", selected.location.summary)}
        </dl>
      </aside>
    </div>
  `;
}

function badgesView(selected, selectedBadges) {
  const grouped = groupBy(selectedBadges, "category");
  return `
    <div class="badge-board">
      ${Object.entries(grouped).map(([category, badges]) => `
        <section class="badge-group">
          <div class="section-title-row">
            <i data-lucide="award"></i>
            <h2>${escapeHtml(category)}</h2>
            <span>${badges.length}</span>
          </div>
          <div class="badge-grid">
            ${badges.map(badgeCard).join("")}
          </div>
        </section>
      `).join("")}
      ${selected.patents.length ? `
        <section class="badge-group">
          <div class="section-title-row">
            <i data-lucide="file-badge"></i>
            <h2>Patents</h2>
            <span>${selected.patents.length}</span>
          </div>
          <div class="patents">${selected.patents.map(patentItem).join("")}</div>
        </section>
      ` : ""}
    </div>
  `;
}

function bindEvents() {
  document.querySelector("#global-search")?.addEventListener("input", (event) => {
    state.query = event.target.value;
    render();
    document.querySelector("#global-search")?.focus();
  });

  document.querySelectorAll("[data-person-id]").forEach((button) => {
    button.addEventListener("click", () => {
      state.selectedId = button.dataset.personId;
      state.tab = "profile";
      render();
    });
  });

  document.querySelectorAll("[data-filter]").forEach((button) => {
    button.addEventListener("click", () => {
      state.availability = button.dataset.filter;
      render();
    });
  });

  document.querySelectorAll("[data-tab]").forEach((button) => {
    button.addEventListener("click", () => {
      state.tab = button.dataset.tab;
      render();
    });
  });

  document.querySelectorAll("[data-action]").forEach((button) => {
    button.addEventListener("click", () => handleAction(button.dataset.action));
  });
}

async function handleAction(action) {
  const person = getSelectedPerson();
  if (action === "copy-email") {
    await copyText(person.email, "Email copied");
  }
  if (action === "copy-phone") {
    await copyText(person.mobilePhone, "Phone copied");
  }
  if (action === "copy-slack") {
    await copyText(person.slackId, "Slack ID copied");
  }
  if (action === "video") {
    showToast("Video conference ready");
  }
  if (action === "download-vcard") {
    downloadVcard(person);
    showToast("Contact downloaded");
  }
}

function filterButton(value, label) {
  const selected = state.availability === value ? "is-active" : "";
  return `<button class="${selected}" type="button" data-filter="${value}">${label}</button>`;
}

function tabButton(value, label, icon) {
  const selected = state.tab === value ? "is-active" : "";
  return `
    <button class="${selected}" type="button" data-tab="${value}">
      <i data-lucide="${icon}"></i>
      ${label}
    </button>
  `;
}

function actionButton(action, icon, label) {
  return `
    <button class="primary-button" type="button" data-action="${action}">
      <i data-lucide="${icon}"></i>
      ${label}
    </button>
  `;
}

function section(title, icon, body) {
  return `
    <section class="content-section">
      <div class="section-title-row">
        <i data-lucide="${icon}"></i>
        <h2>${title}</h2>
      </div>
      ${body}
    </section>
  `;
}

function sidePanel(title, icon, body) {
  return `
    <section class="side-panel">
      <div class="section-title-row">
        <i data-lucide="${icon}"></i>
        <h2>${title}</h2>
      </div>
      ${body}
    </section>
  `;
}

function personListItem(person) {
  const selected = person.id === state.selectedId ? "is-selected" : "";
  return `
    <button class="person-row ${selected}" type="button" data-person-id="${person.id}">
      ${avatar(person, "avatar-sm")}
      <span class="person-row-copy">
        <strong>${escapeHtml(person.displayName)}</strong>
        <span>${escapeHtml(person.title)}</span>
      </span>
      <span class="status-dot ${person.availability.status}" title="${statusCopy[person.availability.status]}"></span>
    </button>
  `;
}

function avatar(person, sizeClass) {
  const initials = person.displayName
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return `<span class="avatar ${sizeClass}" data-tone="${toneFor(person.id)}">${escapeHtml(initials)}</span>`;
}

function orgCrumb(person, current = false) {
  return `
    <button class="org-crumb ${current ? "is-current" : ""}" type="button" data-person-id="${person.id}">
      ${avatar(person, "avatar-xs")}
      <span>${escapeHtml(person.displayName)}</span>
      ${current ? "" : `<i data-lucide="chevron-right"></i>`}
    </button>
  `;
}

function reportCard(person) {
  return `
    <button class="report-card" type="button" data-person-id="${person.id}">
      ${avatar(person, "avatar-md")}
      <strong>${escapeHtml(person.displayName)}</strong>
      <span>${escapeHtml(person.title)}</span>
    </button>
  `;
}

function badgePill(badge) {
  return `
    <div class="badge-pill">
      <span data-tone="${toneFor(badge.id)}"><i data-lucide="award"></i></span>
      <strong>${escapeHtml(badge.name)}</strong>
      <small>${escapeHtml(badge.category)}</small>
    </div>
  `;
}

function badgeCard(badge) {
  return `
    <article class="badge-card">
      <div class="badge-medal" data-tone="${toneFor(badge.id)}">
        <i data-lucide="award"></i>
      </div>
      <div>
        <h3>${escapeHtml(badge.name)}</h3>
        <p>${escapeHtml(badge.issuer)}</p>
        <time>${escapeHtml(badge.earnedDate)}</time>
      </div>
    </article>
  `;
}

function patentItem(patent) {
  return `
    <article class="patent-card">
      <i data-lucide="file-badge"></i>
      <div>
        <h3>${escapeHtml(patent.title)}</h3>
        <p>${escapeHtml(patent.status)}</p>
      </div>
    </article>
  `;
}

function profileLink(link) {
  return `
    <a class="profile-link" href="${escapeAttribute(link.url)}" target="_blank" rel="noreferrer">
      <i data-lucide="external-link"></i>
      <span>${escapeHtml(link.label)}</span>
    </a>
  `;
}

function tag(value) {
  return `<span class="tag">${escapeHtml(value)}</span>`;
}

function emptyPrompt(actionLabel, message) {
  return `
    <div class="empty-prompt">
      <i data-lucide="sparkles"></i>
      <p>${escapeHtml(message)}</p>
      <button class="text-button" type="button">${escapeHtml(actionLabel)}</button>
    </div>
  `;
}

function contactLine(icon, label, value) {
  return `
    <div class="contact-line">
      <i data-lucide="${icon}"></i>
      <span>
        <small>${escapeHtml(label)}</small>
        <strong>${escapeHtml(value)}</strong>
      </span>
    </div>
  `;
}

function infoItem(label, value) {
  return `
    <div>
      <dt>${escapeHtml(label)}</dt>
      <dd>${escapeHtml(value || "-")}</dd>
    </div>
  `;
}

function managerLink(managerId) {
  const manager = getPerson(managerId);
  if (!manager) {
    return `<strong>Top of org</strong>`;
  }
  return `
    <button class="inline-person" type="button" data-person-id="${manager.id}">
      ${avatar(manager, "avatar-xs")}
      <strong>${escapeHtml(manager.displayName)}</strong>
    </button>
  `;
}

function orgNode(person, selectedId, depth = 0) {
  const children = person.directReportIds.map(getPerson).filter(Boolean);
  const selected = person.id === selectedId ? "is-selected" : "";
  return `
    <div class="org-node-wrap" style="--depth: ${depth}">
      <button class="org-node ${selected}" type="button" data-person-id="${person.id}">
        ${avatar(person, "avatar-sm")}
        <span>
          <strong>${escapeHtml(person.displayName)}</strong>
          <small>${escapeHtml(person.title)}</small>
        </span>
      </button>
      ${children.length ? `<div class="org-children">${children.map((child) => orgNode(child, selectedId, depth + 1)).join("")}</div>` : ""}
    </div>
  `;
}

function getVisiblePeople() {
  const query = state.query.trim().toLowerCase();
  return state.people
    .filter((person) => state.availability === "all" || person.availability.status === state.availability)
    .filter((person) => {
      if (!query) return true;
      const haystack = [
        person.displayName,
        person.title,
        person.department,
        person.location.summary,
        person.tags.join(" "),
        person.additionalInformation.slackWorkspaces.join(" "),
      ].join(" ").toLowerCase();
      return haystack.includes(query);
    })
    .sort((a, b) => a.displayName.localeCompare(b.displayName));
}

function getSelectedPerson() {
  return getPerson(state.selectedId) || state.people[0];
}

function getPerson(id) {
  return state.people.find((person) => person.id === id);
}

function getBadge(id) {
  return state.badges.find((badge) => badge.id === id);
}

function getOrgUnit(id) {
  return state.orgUnits.find((orgUnit) => orgUnit.id === id);
}

function getManagerTrail(person) {
  return person.managerChain.map(getPerson).filter(Boolean);
}

function groupBy(items, key) {
  return items.reduce((groups, item) => {
    const group = item[key] || "Other";
    groups[group] = groups[group] || [];
    groups[group].push(item);
    return groups;
  }, {});
}

function toneFor(value) {
  const tones = ["red", "blue", "green", "amber", "violet", "teal"];
  const total = Array.from(value).reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return tones[total % tones.length];
}

async function copyText(value, message) {
  try {
    await navigator.clipboard.writeText(value);
    showToast(message);
  } catch {
    showToast(value);
  }
}

function showToast(message) {
  const toast = document.querySelector("#toast");
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add("is-visible");
  window.setTimeout(() => toast.classList.remove("is-visible"), 1800);
}

function downloadVcard(person) {
  const vcard = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `FN:${person.displayName}`,
    `TITLE:${person.title}`,
    `EMAIL:${person.email}`,
    `TEL:${person.mobilePhone}`,
    `ADR:;;${person.location.address};${person.location.city};${person.location.state};${person.location.postalCode};${person.location.country}`,
    "END:VCARD",
  ].join("\n");
  const blob = new Blob([vcard], { type: "text/vcard" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${person.username}.vcf`;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function refreshIcons() {
  if (window.lucide) {
    window.lucide.createIcons({ attrs: { "stroke-width": 1.8 } });
  }
}

window.addEventListener("load", refreshIcons);

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function escapeAttribute(value) {
  return escapeHtml(value).replace(/`/g, "&#096;");
}

bootstrap();
