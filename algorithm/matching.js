/*
 * Capacity-aware maximum bipartite matching using Kuhn's DFS algorithm.
 * Each project capacity is expanded into equivalent slots internally.
 */
(function attachMatchingAlgorithm(global) {
  "use strict";

  function normalize(value) {
    return String(value).trim().toLocaleLowerCase();
  }

  function automaticCompatibility(student, project) {
    const studentTerms = new Set([...student.skills, ...student.interests].map(normalize));
    return project.requiredSkills.some((skill) => studentTerms.has(normalize(skill)));
  }

  function buildGraph(students, projects, manualEdges, mode) {
    const edges = [];
    const adjacency = students.map((student) => {
      const preferredIds = student.preferences || [];
      const compatible = projects.filter((project) => {
        const isAutomatic = automaticCompatibility(student, project);
        const isManual = manualEdges.has(`${student.id}|${project.id}`);
        if (mode === "manual") return isManual;
        if (mode === "hybrid") return isAutomatic || isManual;
        return isAutomatic;
      });
      compatible.sort((left, right) => {
        const leftRank = preferredIds.indexOf(left.id);
        const rightRank = preferredIds.indexOf(right.id);
        const leftValue = leftRank < 0 ? Number.MAX_SAFE_INTEGER : leftRank;
        const rightValue = rightRank < 0 ? Number.MAX_SAFE_INTEGER : rightRank;
        return leftValue - rightValue || projects.indexOf(left) - projects.indexOf(right);
      });
      compatible.forEach((project) => edges.push({ studentId: student.id, projectId: project.id }));
      return compatible;
    });
    return { adjacency, edges };
  }

  function maximumMatching(students, projects, adjacency) {
    const slots = [];
    projects.forEach((project, projectIndex) => {
      for (let slotNumber = 0; slotNumber < project.capacity; slotNumber += 1) {
        slots.push({ projectIndex, slotNumber });
      }
    });

    const ownerBySlot = Array(slots.length).fill(-1);
    const slotByStudent = Array(students.length).fill(-1);
    const augmentations = [];

    function tryAugment(studentIndex, visitedSlots, reassignmentSteps) {
      for (const project of adjacency[studentIndex]) {
        const projectIndex = projects.indexOf(project);
        for (let slotIndex = 0; slotIndex < slots.length; slotIndex += 1) {
          if (slots[slotIndex].projectIndex !== projectIndex || visitedSlots.has(slotIndex)) continue;
          visitedSlots.add(slotIndex);

          const previousStudent = ownerBySlot[slotIndex];
          if (previousStudent === -1 || tryAugment(previousStudent, visitedSlots, reassignmentSteps)) {
            ownerBySlot[slotIndex] = studentIndex;
            slotByStudent[studentIndex] = slotIndex;
            if (previousStudent !== -1) {
              const destinationSlot = slotByStudent[previousStudent];
              const previousLabel = `${projects[slots[slotIndex].projectIndex].name} (slot ${slots[slotIndex].slotNumber + 1})`;
              const destinationLabel = destinationSlot < 0 ? "an available project slot" : `${projects[slots[destinationSlot].projectIndex].name} (slot ${slots[destinationSlot].slotNumber + 1})`;
              const currentLabel = `${projects[projectIndex].name} (slot ${slots[slotIndex].slotNumber + 1})`;
              reassignmentSteps.push(`${students[previousStudent].name} shifts from ${previousLabel} to ${destinationLabel}; ${students[studentIndex].name} takes ${currentLabel}.`);
            }
            return true;
          }
        }
      }
      return false;
    }

    // A successful DFS finds an alternating path to a free slot and increases matching size by one.
    students.forEach((student, studentIndex) => {
      const reassignmentSteps = [];
      if (tryAugment(studentIndex, new Set(), reassignmentSteps)) {
        augmentations.push({ studentId: student.id, studentName: student.name, steps: reassignmentSteps });
      }
    });

    const assignments = students.map((student, studentIndex) => {
      const slotIndex = slotByStudent[studentIndex];
      return slotIndex < 0 ? null : {
        studentId: student.id,
        projectId: projects[slots[slotIndex].projectIndex].id,
        slotNumber: slots[slotIndex].slotNumber + 1
      };
    }).filter(Boolean);

    return { assignments, augmentations, matchedCount: assignments.length };
  }

  global.AllocationAlgorithm = { automaticCompatibility, buildGraph, maximumMatching };
})(window);
