# Student Project Allocation Using Bipartite Graphs and Matching

A beginner-friendly Discrete Mathematics project that models student-to-project compatibility as a bipartite graph and uses a capacity-aware Kuhn DFS algorithm to find a maximum matching.

## Problem Statement

Students have different skills and interests, while projects require particular skills and have limited capacities. The application represents students and projects as two disjoint vertex sets and a compatibility relation as edges between the sets. It finds an assignment that allocates as many students as possible without assigning a student more than once or exceeding project capacity.

## Objective

Demonstrate graph modeling, adjacency representations, augmenting paths, and maximum bipartite matching through a practical allocation scenario. Preferences order the DFS choices, but the standard maximum-cardinality algorithm does not promise the globally best preference outcome.

## DML Concepts Used

- **Graph:** vertices connected by edges.
- **Bipartite graph:** vertices divide into student set S and project set P; edges only cross between the sets.
- **Vertex:** a student or project node.
- **Edge:** a compatible student-project pair.
- **Matching:** selected compatibility edges that do not reuse a student and respect project slots.
- **Maximum matching:** a matching with the largest possible number of assigned students.
- **Augmenting path:** an alternating path from an unmatched student to a free project slot. Flipping its unmatched/matched edges grows the matching.
- **Adjacency matrix:** a binary student-by-project representation of graph edges.
- **Adjacency list:** each student and its neighboring projects.
- **Project capacity:** the maximum number of students accepted by a project, represented internally by multiple equivalent slots.

## Bipartite Graph Explanation

Let S be the set of students and P the set of projects. An edge (s, p) belongs to E when the selected compatibility mode says student s can work on project p. Since every edge connects S to P, G = (S ∪ P, E) is bipartite. The interactive graph puts students on the left and projects on the right.

## Matching Explanation

The algorithm expands each project's capacity into slots, such as AI Chatbot slot 1 and AI Chatbot slot 2. It runs Kuhn's DFS matching over students and slots. A student gets at most one slot, and each slot has one owner. The UI groups slots back into their original project names.

## Algorithm Used

`algorithm/matching.js` contains a capacity-aware implementation of Kuhn's augmenting-path algorithm. For each student, depth-first search tries compatible projects in preference order. If a slot is occupied, DFS attempts to move that slot's current student to another compatible free slot. When a free slot is reached, the chain is reassigned and the matching grows by one. A visited-slot set prevents cycles during one search.

With V student vertices and C total project slots, the basic DFS implementation runs in O(VE') time, where E' is the student-to-slot edge count. The demo keeps data small so the algorithm can be followed in class.

## Project Features

- Ten ready-to-use students and six projects.
- Automatic compatibility based on skill or interest overlap.
- Manual-only and hybrid compatibility modes.
- Add and delete student/project entries without reloading.
- Preference-aware search ordering and preference rank in results.
- Interactive Cytoscape.js bipartite graph with highlighted matching edges.
- Live dashboard statistics, allocation table, and unallocated explanations.
- Dynamic adjacency matrix and adjacency list.
- Successful DFS reassignment trace to illustrate augmenting paths.
- Reset allocation while retaining the current data.
- CSV export of the allocation result.
- Responsive layout for presentation screens and phones.

## Technology Used

- HTML5
- CSS3
- Vanilla JavaScript
- Cytoscape.js (loaded from its public CDN for graph visualization)
- JavaScript objects for the demo dataset

No application server, database, build step, framework, or package installation is used. The graph visualization requires an internet connection to load Cytoscape.js from the CDN; the allocation and other page logic are local JavaScript.

## Folder Structure

```text
Student-Project-Allocation/
├── index.html
├── style.css
├── script.js
├── data/
│   └── data.js
├── algorithm/
│   └── matching.js
└── README.md
```

## How to Run

1. Open `index.html` directly in a modern browser, or open this folder in VS Code and use **Open with Live Server** if that extension is already installed.
2. Select **Load demo data** if the page does not already contain the sample set.
3. Keep the compatibility mode on **Automatic** to use skills and interests, or use the compatibility table to define manual edges.
4. Select **Run project allocation** to compute and inspect the matching.

Opening the HTML directly works because all application code is plain static files. An internet connection is needed for the Cytoscape.js CDN and the optional web fonts.

## Deploy to Vercel

This is a static site and does not need a build command or server configuration.

1. Push the project folder to a GitHub, GitLab, or Bitbucket repository.
2. In [Vercel](https://vercel.com/), select **Add New > Project** and import that repository.
3. Set **Framework Preset** to **Other**. Leave the root directory at the project root, leave the build command blank, and set the output directory to `.`.
4. Select **Deploy**. Vercel serves `index.html` and the existing asset folders directly.

The interactive graph and web fonts load from third-party CDNs, so visitors need an internet connection to use the graph and see the selected fonts. After pushing changes to the connected branch, Vercel will create a new deployment automatically.

## How the Algorithm Works

1. Expand each project into as many internal slots as its capacity.
2. Visit students one at a time and inspect compatible projects in preference order.
3. For each compatible slot, use DFS. If it is empty, assign it. If occupied, recursively try to relocate its student.
4. If relocation succeeds, use the freed slot for the current student. This alternating reassignment is an augmenting path.
5. If DFS cannot reach a free slot, leave the current student unmatched for this search.
6. After processing all students, the resulting matching has maximum cardinality for this graph.

## Sample Input

- Vedant: Python, AI, Web Development; interests in AI and Web Development; prefers AI Chatbot, College Website, then Data Analytics.
- AI Chatbot: Python, AI, Machine Learning; capacity 2.
- College Website: Web Development, UI Design, Java; capacity 2.
- Compatibility is generated when student skills or interests overlap a project's required skills.

## Sample Output

The starter dataset has 10 students, 6 projects, and total capacity 11. The dashboard and allocation table compute the precise assignment from the current compatibility mode when **Run project allocation** is clicked. The result includes each allocated student's project and preference rank, any unallocated students with a reason, and the total matching size.

## Future Scope

- Add weighted optimization for preference satisfaction after maximum cardinality.
- Support richer skill levels instead of binary compatibility.
- Save scenarios in browser storage and compare multiple matching runs.
- Add step-by-step animation of each augmenting path.

## Conclusion

This project turns a familiar college allocation question into a visible graph problem. The two partitions, compatibility edges, capacity slots, augmenting DFS, and final maximum matching connect the implementation directly to core Discrete Mathematics concepts.

## Short Viva Explanation: Kuhn / DFS

Kuhn's algorithm builds a matching by searching for augmenting paths. For each unmatched student, DFS checks compatible project slots. If a slot is already occupied, it recursively searches for another slot for its current student. If it finds a free slot, it updates the assignments along that path. Repeating this process until no more students can be added produces a maximum-cardinality bipartite matching. In this project, each project capacity is represented by multiple slots before the same algorithm is applied.
