/* Browser-side interface and rendering for the allocation demonstration. */
(function startAllocationApp() {
  "use strict";

  const state = {
    students: [],
    projects: [],
    manualEdges: new Set(),
    mode: "auto",
    graph: { adjacency: [], edges: [] },
    result: null,
    cy: null
  };

  const byId = (id) => document.getElementById(id);
  const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[character]);
  const splitTerms = (value) => value.split(",").map((term) => term.trim()).filter(Boolean);
  const edgeKey = (studentId, projectId) => `${studentId}|${projectId}`;
  let toastTimer;

  function showToast(message) {
    const toast = byId("toast");
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("show"), 2800);
  }

  function preferenceLabel(student, projectId) {
    const position = (student.preferences || []).indexOf(projectId);
    if (position < 0) return "Not ranked";
    const value = position + 1;
    const suffix = value === 1 ? "st" : value === 2 ? "nd" : value === 3 ? "rd" : "th";
    return `${value}${suffix} choice`;
  }

  function compatibleTerms(student, project) {
    const studentTerms = new Set([...student.skills, ...student.interests].map((term) => term.trim().toLocaleLowerCase()));
    return project.requiredSkills.filter((skill) => studentTerms.has(skill.trim().toLocaleLowerCase()));
  }

  function buildCurrentGraph() {
    state.graph = AllocationAlgorithm.buildGraph(state.students, state.projects, state.manualEdges, state.mode);
  }

  function updateDashboard() {
    const capacity = state.projects.reduce((sum, project) => sum + project.capacity, 0);
    const allocated = state.result ? state.result.matchedCount : 0;
    const percentage = state.students.length ? Math.round((allocated / state.students.length) * 100) : 0;
    byId("stat-students").textContent = state.students.length;
    byId("stat-projects").textContent = state.projects.length;
    byId("stat-capacity").textContent = capacity;
    byId("stat-allocated").textContent = allocated;
    byId("stat-unallocated").textContent = state.students.length - allocated;
    byId("stat-rate").textContent = `${percentage}%`;
    byId("rate-bar").style.width = `${percentage}%`;
    byId("student-count").textContent = `${state.students.length} STUDENTS`;
    byId("project-count").textContent = `${state.projects.length} PROJECTS`;
    byId("manual-edge-count").textContent = `${state.manualEdges.size} MANUAL EDGES`;
    byId("edge-count").textContent = `${state.graph.edges.length} COMPATIBILITY EDGES`;
    byId("matching-total").textContent = allocated;
    byId("unallocated-count").textContent = state.result ? state.result.unallocated.length : 0;
    byId("export-csv").disabled = !state.result;
  }

  function renderStudents() {
    byId("student-list").innerHTML = state.students.length ? state.students.map((student) => `
      <article class="data-item">
        <div class="data-item-main"><div class="data-item-title"><strong>${escapeHtml(student.name)}</strong><code>${escapeHtml(student.id)}</code></div>
        <div class="data-item-meta">Skills: ${escapeHtml(student.skills.join(", ") || "Not specified")}<br>Interests: ${escapeHtml(student.interests.join(", ") || "Not specified")}<br>Preferences: ${escapeHtml((student.preferences || []).map((projectId) => state.projects.find((project) => project.id === projectId)?.name || projectId).join(" → ") || "Not specified")}</div></div>
        <button class="delete-button" type="button" data-delete-student="${escapeHtml(student.id)}" aria-label="Delete ${escapeHtml(student.name)}">Delete</button>
      </article>`).join("") : '<p class="empty-cell">No students yet. Add a student or load the demo data.</p>';
  }

  function renderProjects() {
    byId("project-list").innerHTML = state.projects.length ? state.projects.map((project) => `
      <article class="data-item">
        <div class="data-item-main"><div class="data-item-title"><strong>${escapeHtml(project.name)}</strong><code>${escapeHtml(project.id)}</code></div>
        <div class="data-item-meta">Required: ${escapeHtml(project.requiredSkills.join(", ") || "Manual compatibility only")}<br>Capacity: ${project.capacity} student${project.capacity === 1 ? "" : "s"}</div></div>
        <button class="delete-button" type="button" data-delete-project="${escapeHtml(project.id)}" aria-label="Delete ${escapeHtml(project.name)}">Delete</button>
      </article>`).join("") : '<p class="empty-cell">No projects yet. Add a project or load the demo data.</p>';
  }

  function renderCompatibility() {
    const rows = [];
    state.students.forEach((student) => state.projects.forEach((project) => {
      const overlap = compatibleTerms(student, project);
      const hasManual = state.manualEdges.has(edgeKey(student.id, project.id));
      const isActive = state.mode === "manual" ? hasManual : state.mode === "hybrid" ? overlap.length > 0 || hasManual : overlap.length > 0;
      const source = overlap.length && hasManual ? "SKILL + MANUAL" : overlap.length ? "AUTOMATIC" : hasManual ? "MANUAL" : "NO EDGE";
      rows.push(`<tr><td><strong>${escapeHtml(student.name)}</strong> <span class="edge-source">${escapeHtml(student.id)}</span></td>
        <td>${escapeHtml(project.name)} <span class="edge-source">${escapeHtml(project.id)}</span></td>
        <td>${escapeHtml(overlap.join(", ") || "No shared required skill")}</td>
        <td><input class="edge-toggle" type="checkbox" data-manual-edge="${escapeHtml(edgeKey(student.id, project.id))}" aria-label="Manually connect ${escapeHtml(student.name)} to ${escapeHtml(project.name)}" ${hasManual ? "checked" : ""}> <span class="edge-source">${source}${isActive ? " · ACTIVE" : ""}</span></td></tr>`);
    }));
    byId("compatibility-table").innerHTML = rows.length ? rows.join("") : '<tr><td colspan="4" class="empty-cell">Add at least one student and project to define compatibility.</td></tr>';
  }

  function renderAllocation() {
    if (!state.result) {
      byId("allocation-table").innerHTML = '<tr><td colspan="5" class="empty-cell">Run the matching algorithm to generate results.</td></tr>';
      byId("unallocated-list").innerHTML = '<p class="empty-cell">No allocation has been run yet.</p>';
      byId("matched-edges").innerHTML = '<p class="empty-cell">Matching edges will appear here.</p>';
      byId("augmenting-demo").innerHTML = '<p class="empty-cell">Run allocation to inspect successful reassignment paths.</p>';
      return;
    }

    const assignmentByStudent = new Map(state.result.assignments.map((item) => [item.studentId, item]));
    const projectById = new Map(state.projects.map((project) => [project.id, project]));
    const studentById = new Map(state.students.map((student) => [student.id, student]));
    byId("allocation-table").innerHTML = state.students.map((student) => {
      const assignment = assignmentByStudent.get(student.id);
      const project = assignment ? projectById.get(assignment.projectId) : null;
      return `<tr><td>${escapeHtml(student.id)}</td><td><strong>${escapeHtml(student.name)}</strong></td>
        <td>${project ? escapeHtml(project.name) : "Not allocated"}</td>
        <td class="preference-cell">${project ? escapeHtml(preferenceLabel(student, project.id)) : "-"}</td>
        <td><span class="status ${project ? "" : "status-unallocated"}">${project ? "ALLOCATED" : "UNALLOCATED"}</span></td></tr>`;
    }).join("") || '<tr><td colspan="5" class="empty-cell">There are no students to allocate.</td></tr>';

    const allocationCounts = new Map(state.projects.map((project) => [project.id, 0]));
    state.result.assignments.forEach((item) => allocationCounts.set(item.projectId, allocationCounts.get(item.projectId) + 1));
    byId("unallocated-list").innerHTML = state.result.unallocated.length ? state.result.unallocated.map((studentId) => {
      const student = studentById.get(studentId);
      const compatibleProjects = state.graph.adjacency[state.students.indexOf(student)] || [];
      let possible = "No compatible projects are connected to this student in the current graph.";
      if (compatibleProjects.length) {
        const names = compatibleProjects.map((project) => `${project.name} (${allocationCounts.get(project.id)}/${project.capacity} places used)`).join(", ");
        const allFull = compatibleProjects.every((project) => allocationCounts.get(project.id) >= project.capacity);
        possible = `${allFull ? "All compatible project capacities are full" : "No augmenting path could place this student"}: ${names}.`;
      }
      return `<article class="unallocated-item"><strong>${escapeHtml(student.name)} <span class="edge-source">${escapeHtml(student.id)}</span></strong><p>Possible projects: ${escapeHtml(compatibleProjects.map((project) => project.name).join(", ") || "None in the current graph")}<br>Reason: ${escapeHtml(possible)}</p></article>`;
    }).join("") : '<p class="empty-cell">Every student has a project assignment.</p>';

    byId("matched-edges").innerHTML = state.result.assignments.map((item) => {
      const student = studentById.get(item.studentId);
      const project = projectById.get(item.projectId);
      return `<div class="edge-result"><strong>${escapeHtml(student.name)} → ${escapeHtml(project.name)}</strong><span>${escapeHtml(preferenceLabel(student, project.id))}</span></div>`;
    }).join("") || '<p class="empty-cell">No matching edges were found.</p>';

    const reassigned = state.result.augmentations.filter((item) => item.steps.length > 0);
    if (reassigned.length) {
      const example = reassigned[0];
      byId("augmenting-demo").innerHTML = `<div class="augment-empty"><strong>${escapeHtml(example.studentName)}</strong> entered an occupied part of the graph. DFS found another slot and rearranged the path:</div>
        ${example.steps.map((step, index) => `<div class="augment-step"><span class="edge-source">PATH STEP ${index + 1}</span><br>${escapeHtml(step)}</div>`).join("")}
        <p class="augment-explanation">An alternating path ends at a free project slot. Reassigning its edges adds one student to the matching while keeping every earlier student assigned to at most one slot.</p>`;
    } else {
      byId("augmenting-demo").innerHTML = '<div class="augment-empty">Each successful search in this run reached a free slot directly, so no reassignment was needed.</div><p class="augment-explanation">To create a visible reassignment example, use manual compatibility to make two students share a full project while allowing the earlier student to use another project, then run allocation.</p>';
    }
  }

  function renderMatrixAndList() {
    const activeEdges = new Set(state.graph.edges.map((edge) => edgeKey(edge.studentId, edge.projectId)));
    if (!state.students.length || !state.projects.length) {
      byId("matrix-container").innerHTML = '<p class="empty-cell">Add students and projects to generate the adjacency matrix.</p>';
    } else {
      byId("matrix-container").innerHTML = `<table class="matrix-table"><thead><tr><th>STUDENT / PROJECT</th>${state.projects.map((project) => `<th>${escapeHtml(project.name)}<br><span class="edge-source">CAP ${project.capacity}</span></th>`).join("")}</tr></thead>
        <tbody>${state.students.map((student) => `<tr><td>${escapeHtml(student.name)} <span class="edge-source">${escapeHtml(student.id)}</span></td>${state.projects.map((project) => {
          const connected = activeEdges.has(edgeKey(student.id, project.id));
          return `<td class="matrix-cell ${connected ? "matrix-one" : "matrix-zero"}">${connected ? "1" : "0"}</td>`;
        }).join("")}</tr>`).join("")}</tbody></table>`;
    }

    byId("adjacency-list-content").innerHTML = state.students.length ? state.students.map((student, index) => {
      const neighbors = state.graph.adjacency[index];
      return `<div class="adjacency-row"><span class="adjacency-student">${escapeHtml(student.name)} <span class="edge-source">${escapeHtml(student.id)}</span></span>
        <div class="adjacency-projects">${neighbors.length ? neighbors.map((project) => `<span>→ ${escapeHtml(project.name)}</span>`).join("") : "No adjacent projects"}</div></div>`;
    }).join("") : '<p class="empty-cell">Add students to generate the adjacency list.</p>';
  }

  function renderGraph() {
    byId("graph-empty").hidden = Boolean(state.students.length && state.projects.length);
    if (!state.cy) return;
    const studentCount = state.students.length;
    const projectCount = state.projects.length;
    const rowCount = Math.max(studentCount, projectCount, 1);
    const height = Math.max(360, Math.min(760, rowCount * 59 + 75));
    const container = byId("cy");
    container.style.height = `${height}px`;
    const width = container.clientWidth || 900;
    const studentX = Math.max(120, width * 0.17);
    const projectX = Math.min(width - 120, width * 0.83);
    const positions = new Map();
    state.students.forEach((student, index) => positions.set(`student:${student.id}`, { x: studentX, y: ((index + 1) * height) / (studentCount + 1) }));
    state.projects.forEach((project, index) => positions.set(`project:${project.id}`, { x: projectX, y: ((index + 1) * height) / (projectCount + 1) }));

    const matching = new Set(state.result ? state.result.assignments.map((item) => edgeKey(item.studentId, item.projectId)) : []);
    const elements = [];
    state.students.forEach((student) => elements.push({ data: { id: `student:${student.id}`, label: `${student.name}\n${student.id}` }, position: positions.get(`student:${student.id}`) }));
    state.projects.forEach((project) => elements.push({ data: { id: `project:${project.id}`, label: `${project.name}\nCAPACITY ${project.capacity}` }, position: positions.get(`project:${project.id}`) }));
    state.graph.edges.forEach((edge) => {
      const key = edgeKey(edge.studentId, edge.projectId);
      const isManual = state.manualEdges.has(key);
      const isAutomatic = compatibleTerms(state.students.find((student) => student.id === edge.studentId), state.projects.find((project) => project.id === edge.projectId)).length > 0;
      const classes = [matching.has(key) ? "matched" : "", isManual && !isAutomatic ? "manual" : ""].filter(Boolean).join(" ");
      elements.push({ data: { id: `edge:${edge.studentId}:${edge.projectId}`, source: `student:${edge.studentId}`, target: `project:${edge.projectId}`, studentId: edge.studentId, projectId: edge.projectId }, classes });
    });

    state.cy.elements().remove();
    state.cy.add(elements);
    state.cy.nodes().forEach((node) => node.position(positions.get(node.id())));
    state.cy.resize();
    state.cy.fit(undefined, 35);
  }

  function renderAll() {
    buildCurrentGraph();
    updateDashboard();
    renderStudents();
    renderProjects();
    renderCompatibility();
    renderAllocation();
    renderMatrixAndList();
    renderGraph();
  }

  function clearResult() {
    state.result = null;
  }

  function initializeGraph() {
    if (typeof window.cytoscape !== "function") {
      byId("graph-empty").hidden = false;
      byId("graph-empty").textContent = "Cytoscape.js could not load. Connect to the internet and reload to view the interactive graph.";
      return;
    }
    state.cy = window.cytoscape({
      container: byId("cy"),
      elements: [],
      layout: { name: "preset" },
      minZoom: 0.35,
      maxZoom: 2.5,
      style: [
        { selector: "node", style: { "label": "data(label)", "text-wrap": "wrap", "text-max-width": 112, "text-valign": "center", "text-halign": "center", "font-family": "DM Sans, sans-serif", "font-size": 10, "font-weight": 700, "color": "#ffffff", "width": 104, "height": 50, "shape": "round-rectangle", "background-color": "#c87848", "border-width": 1, "border-color": "#b36b40", "text-outline-width": 0 } },
        { selector: "node[id^='student:']", style: { "shape": "ellipse", "width": 76, "height": 76, "background-color": "#426b48", "border-color": "#31593a", "font-size": 10 } },
        { selector: "edge", style: { "curve-style": "bezier", "control-point-step-size": 42, "width": 1.5, "line-color": "#aab4a4", "target-arrow-shape": "none", "opacity": 0.75 } },
        { selector: "edge.manual", style: { "line-style": "dashed", "line-color": "#467083", "width": 2 } },
        { selector: "edge.matched", style: { "line-color": "#284832", "width": 5, "opacity": 1, "z-index": 5 } },
        { selector: "node:selected", style: { "border-width": 4, "border-color": "#d49a57" } }
      ]
    });
    state.cy.on("tap", "edge", (event) => {
      const edge = event.target;
      const key = edgeKey(edge.data("studentId"), edge.data("projectId"));
      if (state.manualEdges.has(key)) state.manualEdges.delete(key);
      else state.manualEdges.add(key);
      clearResult();
      renderAll();
      showToast("Manual edge updated. It affects the graph in Manual or Hybrid mode.");
    });
  }

  function loadDemo() {
    state.students = JSON.parse(JSON.stringify(window.DemoData.students));
    state.projects = JSON.parse(JSON.stringify(window.DemoData.projects));
    state.manualEdges.clear();
    state.mode = "auto";
    byId("compatibility-mode").value = "auto";
    clearResult();
    renderAll();
    showToast("Demo data loaded: 10 students, 6 projects, and 11 available slots.");
  }

  function resolvePreferences(value) {
    const terms = splitTerms(value);
    const resolved = [];
    for (const term of terms) {
      const project = state.projects.find((item) => item.id.toLocaleLowerCase() === term.toLocaleLowerCase() || item.name.toLocaleLowerCase() === term.toLocaleLowerCase());
      if (!project) return { error: `Preference “${term}” does not match a project name or ID.` };
      if (!resolved.includes(project.id)) resolved.push(project.id);
    }
    return { preferences: resolved };
  }

  function handleStudentSubmit(event) {
    event.preventDefault();
    const id = byId("student-id").value.trim();
    const name = byId("student-name").value.trim();
    const message = byId("student-message");
    message.textContent = "";
    if (!id || !name) { message.textContent = "Enter both a student ID and name."; return; }
    if (state.students.some((student) => student.id.toLocaleLowerCase() === id.toLocaleLowerCase())) { message.textContent = "That student ID already exists."; return; }
    const preferenceResult = resolvePreferences(byId("student-preferences").value);
    if (preferenceResult.error) { message.textContent = preferenceResult.error; return; }
    state.students.push({ id, name, skills: splitTerms(byId("student-skills").value), interests: splitTerms(byId("student-interests").value), preferences: preferenceResult.preferences });
    event.currentTarget.reset();
    clearResult();
    renderAll();
    showToast(`${name} added to student set S.`);
  }

  function handleProjectSubmit(event) {
    event.preventDefault();
    const id = byId("project-id").value.trim();
    const name = byId("project-name").value.trim();
    const capacity = Number(byId("project-capacity").value);
    const message = byId("project-message");
    message.textContent = "";
    if (!id || !name) { message.textContent = "Enter both a project ID and name."; return; }
    if (state.projects.some((project) => project.id.toLocaleLowerCase() === id.toLocaleLowerCase())) { message.textContent = "That project ID already exists."; return; }
    if (state.projects.some((project) => project.name.toLocaleLowerCase() === name.toLocaleLowerCase())) { message.textContent = "A project with that name already exists."; return; }
    if (!Number.isInteger(capacity) || capacity < 1 || capacity > 100) { message.textContent = "Capacity must be a whole number from 1 to 100."; return; }
    state.projects.push({ id, name, requiredSkills: splitTerms(byId("project-skills").value), capacity });
    event.currentTarget.reset();
    byId("project-capacity").value = "2";
    clearResult();
    renderAll();
    showToast(`${name} added to project set P.`);
  }

  function deleteStudent(id) {
    const student = state.students.find((item) => item.id === id);
    state.students = state.students.filter((item) => item.id !== id);
    for (const key of state.manualEdges) if (key.startsWith(`${id}|`)) state.manualEdges.delete(key);
    clearResult();
    renderAll();
    showToast(`${student ? student.name : "Student"} removed.`);
  }

  function deleteProject(id) {
    const project = state.projects.find((item) => item.id === id);
    state.projects = state.projects.filter((item) => item.id !== id);
    state.students.forEach((student) => { student.preferences = student.preferences.filter((projectId) => projectId !== id); });
    for (const key of state.manualEdges) if (key.endsWith(`|${id}`)) state.manualEdges.delete(key);
    clearResult();
    renderAll();
    showToast(`${project ? project.name : "Project"} removed.`);
  }

  function runAllocation() {
    if (!state.students.length) { showToast("Add at least one student before running allocation."); return; }
    if (!state.projects.length) { showToast("Add at least one project before running allocation."); return; }
    buildCurrentGraph();
    const matching = AllocationAlgorithm.maximumMatching(state.students, state.projects, state.graph.adjacency);
    const assigned = new Set(matching.assignments.map((item) => item.studentId));
    state.result = { ...matching, unallocated: state.students.filter((student) => !assigned.has(student.id)).map((student) => student.id) };
    renderAll();
    byId("allocation").scrollIntoView({ behavior: "smooth", block: "start" });
    showToast(`Maximum matching found: ${matching.matchedCount} of ${state.students.length} students allocated.`);
  }

  function exportCsv() {
    if (!state.result) return;
    const assignmentByStudent = new Map(state.result.assignments.map((item) => [item.studentId, item]));
    const projectById = new Map(state.projects.map((project) => [project.id, project]));
    const rows = [["Student ID", "Student Name", "Allocated Project", "Preference", "Status"]];
    state.students.forEach((student) => {
      const assignment = assignmentByStudent.get(student.id);
      const project = assignment ? projectById.get(assignment.projectId) : null;
      rows.push([student.id, student.name, project ? project.name : "Not Allocated", project ? preferenceLabel(student, project.id) : "-", project ? "Allocated" : "Unallocated"]);
    });
    const csv = rows.map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "student-project-allocation.csv";
    link.click();
    URL.revokeObjectURL(url);
    showToast("Allocation CSV exported.");
  }

  function attachEvents() {
    byId("run-allocation").addEventListener("click", runAllocation);
    byId("load-demo").addEventListener("click", loadDemo);
    byId("reset-allocation").addEventListener("click", () => { clearResult(); renderAll(); showToast("Matching cleared. Student and project data are unchanged."); });
    byId("export-csv").addEventListener("click", exportCsv);
    byId("student-form").addEventListener("submit", handleStudentSubmit);
    byId("project-form").addEventListener("submit", handleProjectSubmit);
    byId("compatibility-mode").addEventListener("change", (event) => { state.mode = event.currentTarget.value; clearResult(); renderAll(); });
    byId("student-list").addEventListener("click", (event) => { const button = event.target.closest("[data-delete-student]"); if (button) deleteStudent(button.dataset.deleteStudent); });
    byId("project-list").addEventListener("click", (event) => { const button = event.target.closest("[data-delete-project]"); if (button) deleteProject(button.dataset.deleteProject); });
    byId("compatibility-table").addEventListener("change", (event) => {
      const checkbox = event.target.closest("[data-manual-edge]");
      if (!checkbox) return;
      if (checkbox.checked) state.manualEdges.add(checkbox.dataset.manualEdge);
      else state.manualEdges.delete(checkbox.dataset.manualEdge);
      clearResult();
      renderAll();
    });

    const navigationLinks = [...document.querySelectorAll(".main-nav a")];
    const sections = navigationLinks.map((link) => document.querySelector(link.getAttribute("href"))).filter(Boolean);
    if ("IntersectionObserver" in window) {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) navigationLinks.forEach((link) => link.classList.toggle("active", link.hash === `#${entry.target.id}`));
        });
      }, { rootMargin: "-20% 0px -70% 0px" });
      sections.forEach((section) => observer.observe(section));
    }
    window.addEventListener("resize", () => { if (state.cy) renderGraph(); });
  }

  document.addEventListener("DOMContentLoaded", () => {
    initializeGraph();
    attachEvents();
    loadDemo();
  });
})();
