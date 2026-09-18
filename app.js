(function () {
  "use strict";

  var CHECKLIST_KEY = "devoteam-prep-checklist-v1";
  var state = {
    data: null,
    sources: new Map(),
    query: "",
    evidence: "all",
    checklist: {}
  };

  function element(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined && text !== null) node.textContent = String(text);
    return node;
  }

  function append(parent) {
    Array.prototype.slice.call(arguments, 1).forEach(function (child) {
      if (child) parent.appendChild(child);
    });
    return parent;
  }

  function list(items, ordered) {
    var node = element(ordered ? "ol" : "ul");
    (items || []).forEach(function (item) {
      node.appendChild(element("li", "", item));
    });
    return node;
  }

  function safeId(value) {
    return String(value || "")
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  function safeHttpUrl(value) {
    if (!value) return null;
    try {
      var url = new URL(value);
      return url.protocol === "https:" || url.protocol === "http:" ? url.href : null;
    } catch (_) {
      return null;
    }
  }

  function flattenText(value, output) {
    output = output || [];
    if (value === null || value === undefined) return output;
    if (typeof value === "string" || typeof value === "number") {
      output.push(String(value));
    } else if (Array.isArray(value)) {
      value.forEach(function (entry) {
        flattenText(entry, output);
      });
    } else if (typeof value === "object") {
      Object.keys(value).forEach(function (key) {
        flattenText(value[key], output);
      });
    }
    return output;
  }

  function searchable(node, data, evidenceType) {
    node.classList.add("searchable");
    node.dataset.search = flattenText(data).join(" ").toLocaleLowerCase();
    if (evidenceType) node.dataset.evidence = evidenceType;
    return node;
  }

  function evidenceBadge(type) {
    var normalized = ["Fact", "Inference", "Anecdote", "Unknown"].includes(type)
      ? type
      : "Unknown";
    return element(
      "span",
      "evidence-badge evidence-badge--" + normalized.toLowerCase(),
      normalized
    );
  }

  function categoryBadge(text) {
    return element("span", "category-badge", text);
  }

  function priorityBadge(text) {
    var modifier = safeId(text);
    return element("span", "priority-badge priority-badge--" + modifier, text);
  }

  function sourceJump(sourceId) {
    if (!sourceId || !state.sources.has(sourceId)) return null;
    var link = element("a", "source-jump", "Source");
    link.href = "#source-" + safeId(sourceId);
    link.setAttribute("aria-label", "Jump to source: " + state.sources.get(sourceId).title);
    return link;
  }

  function badgeRow(type, sourceId, extra) {
    var row = element("div", "badge-row");
    if (type) row.appendChild(evidenceBadge(type));
    if (extra) row.appendChild(extra);
    var jump = sourceJump(sourceId);
    if (jump) row.appendChild(jump);
    return row;
  }

  function replace(id, node) {
    var target = document.getElementById(id);
    if (!target) return;
    target.replaceChildren(node);
  }

  function card(title, text, type, sourceId) {
    var node = element("article", "content-card ui-card");
    append(node, badgeRow(type, sourceId), element("h3", "", title), element("p", "", text));
    return searchable(node, { title: title, text: text }, type);
  }

  function sectionLink(label, href) {
    var link = element("a", "", label);
    link.href = href;
    return link;
  }

  function renderHero(data) {
    document.getElementById("updated-date").textContent = data.meta.updated;
    document.getElementById("role-hypothesis").textContent = data.hero.roleHypothesis;
    document.getElementById("role-confidence").textContent = data.hero.confidence;
    document.getElementById("interview-objective").textContent = data.hero.objective;
    document.title = data.meta.title;

    var tags = document.getElementById("hero-tags");
    tags.replaceChildren();
    data.hero.tags.forEach(function (tag) {
      var topic = element("span", "tag", tag);
      topic.setAttribute("role", "listitem");
      tags.appendChild(topic);
    });
  }

  function renderQuick(data) {
    var root = element("div", "stack");

    var briefing = element("div", "quick-block");
    var briefingHead = element("div", "quick-block__heading");
    append(briefingHead, element("h3", "", "Six things to remember"));
    var briefingGrid = element("div", "grid grid--three");
    data.briefing.forEach(function (item) {
      briefingGrid.appendChild(card(item.title, item.text, item.type, item.sourceId));
    });
    append(briefing, briefingHead, briefingGrid);

    var facts = element("div", "quick-block");
    var factsHead = element("div", "quick-block__heading");
    append(factsHead, element("h3", "", "Top company facts"), sectionLink("Full context →", "#company"));
    var factsGrid = element("div", "grid grid--facts");
    data.companyFacts
      .filter(function (item) {
        return item.featured;
      })
      .forEach(function (item) {
        var fact = element("article", "fact-card ui-card");
        append(
          fact,
          badgeRow(item.type, item.sourceId),
          element("strong", "fact-card__value", item.value),
          element("span", "fact-card__label", item.label),
          element("p", "", item.detail)
        );
        factsGrid.appendChild(searchable(fact, item, item.type));
      });
    append(facts, factsHead, factsGrid);

    var stories = element("div", "quick-block");
    var storiesHead = element("div", "quick-block__heading");
    append(storiesHead, element("h3", "", "Three strongest stories"), sectionLink("STAR outlines →", "#stories"));
    var storyGrid = element("div", "grid grid--three");
    data.stories
      .filter(function (item) {
        return item.featured;
      })
      .slice(0, 3)
      .forEach(function (item) {
        var node = element("article", "content-card ui-card");
        append(
          node,
          categoryBadge(item.signal),
          element("h3", "", item.title),
          element("p", "", item.summary),
          sectionLink("Open full story →", "#story-" + safeId(item.id))
        );
        storyGrid.appendChild(searchable(node, item, item.type));
      });
    append(stories, storiesHead, storyGrid);

    var questions = element("div", "quick-block");
    var questionHead = element("div", "quick-block__heading");
    append(questionHead, element("h3", "", "Five likely recruiter questions"), sectionLink("Answer practice →", "#questions"));
    var questionGrid = element("div", "grid grid--two");
    data.interviewQuestions
      .filter(function (item) {
        return item.featured;
      })
      .slice(0, 5)
      .forEach(function (item) {
        var node = element("article", "content-card ui-card");
        append(
          node,
          badgeRow("Inference", "", categoryBadge(item.category)),
          element("h3", "", item.question),
          element("p", "", item.why)
        );
        questionGrid.appendChild(searchable(node, item, "Inference"));
      });
    append(questions, questionHead, questionGrid);

    append(root, briefing, facts, stories, questions);
    replace("quick-content", root);
  }

  function renderCompany(data) {
    var root = element("div", "stack");
    var factGrid = element("div", "grid grid--four");
    data.companyFacts.forEach(function (item) {
      var node = element("article", "fact-card ui-card");
      append(
        node,
        badgeRow(item.type, item.sourceId),
        element("strong", "fact-card__value", item.value),
        element("span", "fact-card__label", item.label),
        element("p", "", item.detail)
      );
      factGrid.appendChild(searchable(node, item, item.type));
    });
    root.appendChild(factGrid);

    data.companySections.forEach(function (group) {
      root.appendChild(element("h3", "subsection-title", group.title));
      var grid = element("div", "grid grid--two");
      group.items.forEach(function (item) {
        grid.appendChild(card(item.title, item.text, item.type, item.sourceId));
      });
      root.appendChild(grid);
    });

    root.appendChild(element("h3", "subsection-title", "Client case to know"));
    var caseCard = element("article", "content-card ui-card");
    append(
      caseCard,
      badgeRow(data.clientCase.type, data.clientCase.sourceId),
      element("h3", "", data.clientCase.title),
      element("p", "", data.clientCase.summary),
      element("h4", "subsection-title", "Architecture"),
      list(data.clientCase.architecture),
      element("h4", "subsection-title", "Why it matters"),
      element("p", "", data.clientCase.whyItMatters),
      element("div", "boundary", data.clientCase.interviewBridge)
    );
    root.appendChild(searchable(caseCard, data.clientCase, data.clientCase.type));

    replace("company-content", root);
  }

  function renderRole(data) {
    var root = element("div", "stack");
    var intro = element("article", "quote-card ui-card");
    intro.appendChild(element("p", "", data.role.summary));
    root.appendChild(searchable(intro, data.role.summary));

    var ambiguity = element("article", "content-card ui-card");
    append(
      ambiguity,
      badgeRow("Inference", "mlops-role"),
      element("h3", "", "Title ambiguity"),
      element("p", "", data.role.ambiguity),
      element("h4", "subsection-title", "Possible titles"),
      list(data.role.possibleTitles)
    );
    root.appendChild(searchable(ambiguity, data.role, "Inference"));

    var columns = element("div", "grid grid--two");
    var work = element("article", "content-card ui-card");
    append(work, element("h3", "", "Verified responsibilities"), list(data.role.responsibilities));
    columns.appendChild(searchable(work, data.role.responsibilities, "Fact"));

    var clarify = element("article", "content-card ui-card");
    append(
      clarify,
      badgeRow("Unknown"),
      element("h3", "", "Ask the recruiter to clarify"),
      list(data.role.askToClarify)
    );
    columns.appendChild(searchable(clarify, data.role.askToClarify, "Unknown"));
    root.appendChild(columns);

    root.appendChild(element("h3", "subsection-title", "Requirement clusters"));
    var requirements = element("div", "grid grid--three");
    data.role.requirements.forEach(function (group) {
      var node = element("article", "content-card ui-card");
      append(node, element("h3", "", group.area), list(group.items));
      requirements.appendChild(searchable(node, group, "Fact"));
    });
    root.appendChild(requirements);

    var fit = element("div", "grid grid--two");
    var strong = element("article", "content-card ui-card");
    append(strong, element("h3", "", "Strong evidence"), list(data.fit.strong));
    fit.appendChild(searchable(strong, data.fit.strong, "Fact"));
    var partial = element("article", "content-card ui-card");
    append(partial, element("h3", "", "Partial or adjacent evidence"), list(data.fit.partial));
    fit.appendChild(searchable(partial, data.fit.partial, "Fact"));
    root.appendChild(element("h3", "subsection-title", "Fit map"));
    root.appendChild(fit);

    var bridge = element("article", "quote-card ui-card");
    append(bridge, element("h3", "", "Honest tool-gap bridge"), element("p", "", data.fit.bridge));
    root.appendChild(searchable(bridge, data.fit.bridge, "Fact"));

    replace("role-content", root);
  }

  function starGrid(star) {
    var grid = element("div", "detail-grid");
    ["situation", "task", "action", "result", "reflection"].forEach(function (key) {
      var panel = element("div", "mini-panel");
      append(panel, element("strong", "", key), element("p", "", star[key]));
      grid.appendChild(panel);
    });
    return grid;
  }

  function renderStories(data) {
    var root = element("div", "stack");
    data.stories.forEach(function (story) {
      var details = element("details", "expand-card ui-card");
      details.id = "story-" + safeId(story.id);
      var summary = element("summary");
      var summaryCopy = element("span");
      append(
        summaryCopy,
        element("span", "summary-title", story.title),
        element("span", "summary-meta", story.signal)
      );
      summary.appendChild(summaryCopy);

      var body = element("div", "detail-body");
      append(
        body,
        badgeRow(story.type, "candidate-evidence"),
        element("p", "", story.summary),
        element("h3", "subsection-title", "Defensible evidence"),
        list(story.evidence),
        element("h3", "subsection-title", "STAR rehearsal"),
        starGrid(story.star),
        element("h3", "subsection-title", "Use this story for")
      );
      var tags = element("div", "tag-row");
      story.useFor.forEach(function (tag) {
        tags.appendChild(element("span", "tag", tag));
      });
      append(body, tags, element("div", "boundary", "Claim boundary: " + story.boundary));
      append(details, summary, body);
      root.appendChild(searchable(details, story, story.type));
    });
    replace("stories-content", root);
  }

  function renderProcess(data) {
    var root = element("div", "stack");
    var grid = element("div", "grid grid--three");
    data.process.forEach(function (stage, index) {
      var node = element("article", "content-card ui-card");
      append(
        node,
        badgeRow(stage.type, "", categoryBadge("Stage " + (index + 1) + " · " + stage.confidence)),
        element("h3", "", stage.name),
        element("h4", "subsection-title", "Likely focus"),
        list(stage.focus),
        element("h4", "subsection-title", "Prepare"),
        list(stage.prepare)
      );
      grid.appendChild(searchable(node, stage, stage.type));
    });
    root.appendChild(grid);

    var unknown = element("article", "content-card ui-card");
    append(
      unknown,
      badgeRow("Unknown"),
      element("h3", "", "Ask for the exact process"),
      list(data.processUnknowns)
    );
    root.appendChild(searchable(unknown, data.processUnknowns, "Unknown"));
    replace("process-content", root);
  }

  function flashcard(cardData) {
    var button = element("button", "flashcard");
    button.type = "button";
    button.setAttribute("aria-expanded", "false");
    button.setAttribute("aria-label", "Flashcard question. Activate to reveal answer.");
    var questionLabel = element("span", "flashcard__label", "Question · tap to flip");
    var question = element("span", "flashcard__question", cardData.q);
    var answerLabel = element("span", "flashcard__label flashcard__answer", "Answer · tap to reset");
    var answer = element("span", "flashcard__answer", cardData.a);
    append(button, questionLabel, question, answerLabel, answer);
    button.addEventListener("click", function () {
      var flipped = button.classList.toggle("is-flipped");
      button.setAttribute("aria-expanded", flipped ? "true" : "false");
      button.setAttribute(
        "aria-label",
        flipped
          ? "Flashcard answer shown. Activate to show question."
          : "Flashcard question. Activate to reveal answer."
      );
      questionLabel.textContent = flipped ? "Question" : "Question · tap to flip";
    });
    return button;
  }

  function renderTechnical(data) {
    var root = element("div", "stack");
    data.technical.forEach(function (topic, index) {
      var details = element("details", "expand-card ui-card technical-topic");
      if (index === 0) details.open = true;
      var summary = element("summary");
      var copy = element("span");
      append(
        copy,
        element("span", "summary-title", topic.title),
        element("span", "summary-meta", topic.model)
      );
      summary.appendChild(copy);

      var body = element("div", "detail-body");
      body.appendChild(element("p", "technical-topic__model", topic.model));
      var two = element("div", "grid grid--two");
      var review = element("div", "mini-panel");
      append(review, element("strong", "", "Revision checklist"), list(topic.revision));
      var framework = element("div", "mini-panel");
      append(framework, element("strong", "", "Answer framework"), list(topic.framework, true));
      append(two, review, framework);
      append(
        body,
        two,
        element("h3", "subsection-title", "Likely questions"),
        list(topic.questions),
        element("h3", "subsection-title", "Flashcards")
      );
      var cards = element("div", "flashcard-grid");
      topic.cards.forEach(function (cardData) {
        cards.appendChild(flashcard(cardData));
      });
      body.appendChild(cards);
      append(details, summary, body);
      root.appendChild(searchable(details, topic));
    });
    replace("technical-content", root);
  }

  function renderQuestions(data) {
    var root = element("div", "stack");
    data.interviewQuestions.forEach(function (question) {
      var details = element("details", "expand-card ui-card answer-card");
      var summary = element("summary");
      var copy = element("span");
      append(
        copy,
        element("span", "summary-title", question.question),
        element("span", "summary-meta", question.category + " · " + question.why)
      );
      summary.appendChild(copy);

      var body = element("div", "detail-body");
      append(
        body,
        badgeRow("Inference", "", categoryBadge(question.category)),
        element("h3", "subsection-title", "Answer guidance"),
        list(question.guide, true)
      );
      if (question.sample) {
        var sample = element("div", "answer-sample");
        append(sample, element("strong", "", "Safe sample"), element("p", "", question.sample));
        body.appendChild(sample);
      }
      body.appendChild(element("div", "boundary", "Watch out: " + question.watch));
      append(details, summary, body);
      root.appendChild(searchable(details, question, "Inference"));
    });
    replace("questions-content", root);
  }

  function renderAsk(data) {
    var root = element("ol", "ask-list");
    data.questionsToAsk.forEach(function (item, index) {
      var node = element("li", "ask-item ui-card");
      var number = element("span", "ask-item__number", index + 1);
      var copy = element("div");
      var badges = element("div", "badge-row");
      append(badges, categoryBadge(item.category), priorityBadge(item.priority));
      append(copy, badges, element("p", "", item.question));
      append(node, number, copy);
      root.appendChild(searchable(node, item));
    });
    replace("ask-content", root);
  }

  function diligenceCard(title, items, type) {
    var node = element("article", "content-card ui-card");
    append(node, badgeRow(type), element("h3", "", title), list(items));
    return searchable(node, items, type);
  }

  function renderDiligence(data) {
    var grid = element("div", "grid grid--three");
    append(
      grid,
      diligenceCard("Verified context", data.dueDiligence.facts, "Fact"),
      diligenceCard("Crowd-sourced signals", data.dueDiligence.anecdotes, "Anecdote"),
      diligenceCard("Confirm before accepting", data.dueDiligence.verify, "Unknown")
    );
    replace("diligence-content", grid);
  }

  function loadChecklistState() {
    try {
      var parsed = JSON.parse(window.localStorage.getItem(CHECKLIST_KEY) || "{}");
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch (_) {
      return {};
    }
  }

  function saveChecklistState() {
    try {
      window.localStorage.setItem(CHECKLIST_KEY, JSON.stringify(state.checklist));
    } catch (_) {
      // Completion still works in memory when storage is unavailable.
    }
  }

  function updateProgress() {
    var total = state.data.checklist.length;
    var complete = state.data.checklist.filter(function (item) {
      return Boolean(state.checklist[item.id]);
    }).length;
    var percent = total ? Math.round((complete / total) * 100) : 0;
    document.getElementById("progress-value").textContent = percent + "%";
    document.getElementById("progress-label").textContent =
      complete + " of " + total + " complete";
    document.getElementById("progress-bar").style.width = percent + "%";
  }

  function renderChecklist(data) {
    state.checklist = loadChecklistState();
    var root = element("ul", "checklist-list");
    data.checklist.forEach(function (item) {
      var node = element("li", "checklist-item ui-card");
      var label = element("label");
      var checkbox = element("input");
      checkbox.type = "checkbox";
      checkbox.checked = Boolean(state.checklist[item.id]);
      checkbox.setAttribute("aria-label", item.label);
      var copy = element("span", "checklist-item__copy");
      append(
        copy,
        element("strong", "", item.label),
        element("small", "", item.group + " · " + item.priority + " priority")
      );
      append(label, checkbox, copy);
      node.appendChild(label);
      checkbox.addEventListener("change", function () {
        state.checklist[item.id] = checkbox.checked;
        saveChecklistState();
        updateProgress();
      });
      root.appendChild(searchable(node, item));
    });
    replace("checklist-content", root);
    updateProgress();
  }

  function renderSources(data) {
    var root = element("ol", "source-list");
    data.sources.forEach(function (source) {
      var item = element("li", "source-item ui-card");
      item.id = "source-" + safeId(source.id);
      var evidenceType = source.type === "Anecdotal" ? "Anecdote" : "Fact";
      append(
        item,
        badgeRow(evidenceType, "", categoryBadge(source.type)),
        element("h3", "", source.title),
        element("p", "", source.publisher + " · " + source.date)
      );
      var url = safeHttpUrl(source.url);
      if (url) {
        var link = element("a", "", "Open source in a new tab ↗");
        link.href = url;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        item.appendChild(link);
      } else {
        item.appendChild(element("p", "", "Private evidence record; no public document linked."));
      }
      root.appendChild(searchable(item, source, evidenceType));
    });
    replace("sources-content", root);
  }

  function applyFilters() {
    var query = state.query.trim().toLocaleLowerCase();
    var evidence = state.evidence;
    var filtering = Boolean(query || evidence !== "all");
    var visible = 0;
    var total = 0;

    document.querySelectorAll(".searchable").forEach(function (node) {
      total += 1;
      var textMatch = !query || node.dataset.search.includes(query);
      var evidenceMatch =
        evidence === "all" || node.dataset.evidence === evidence;
      var show = textMatch && evidenceMatch;
      node.hidden = !show;
      if (show) visible += 1;
    });

    document.querySelectorAll(".study-section").forEach(function (section) {
      if (!filtering) {
        section.hidden = false;
        return;
      }
      var candidates = Array.from(section.querySelectorAll(".searchable"));
      section.hidden =
        candidates.length > 0 &&
        !candidates.some(function (node) {
          return !node.hidden;
        });
    });

    var status = document.getElementById("filter-status");
    status.textContent = filtering
      ? visible + " of " + total + " study cards shown"
      : total + " study cards ready";
  }

  function bindControls() {
    var search = document.getElementById("global-search");
    var evidence = document.getElementById("evidence-filter");
    var clear = document.getElementById("clear-filters");
    var toggleAnswers = document.getElementById("toggle-answers");

    search.addEventListener("input", function () {
      state.query = search.value;
      applyFilters();
    });
    search.addEventListener("keydown", function (event) {
      if (event.key === "Escape") {
        search.value = "";
        state.query = "";
        applyFilters();
      }
    });
    evidence.addEventListener("change", function () {
      state.evidence = evidence.value;
      applyFilters();
    });
    clear.addEventListener("click", function () {
      search.value = "";
      evidence.value = "all";
      state.query = "";
      state.evidence = "all";
      applyFilters();
      search.focus();
    });
    toggleAnswers.addEventListener("click", function () {
      var answers = Array.from(document.querySelectorAll("#questions details.answer-card"));
      var shouldOpen = answers.some(function (answer) {
        return !answer.open && !answer.hidden;
      });
      answers.forEach(function (answer) {
        if (!answer.hidden) answer.open = shouldOpen;
      });
      toggleAnswers.textContent = shouldOpen ? "Collapse all answers" : "Expand all answers";
    });
    document.getElementById("print-page").addEventListener("click", function () {
      window.print();
    });
  }

  function bindSectionObserver() {
    if (!("IntersectionObserver" in window)) return;
    var links = new Map();
    document.querySelectorAll("[data-nav-section]").forEach(function (link) {
      links.set(link.dataset.navSection, link);
    });
    var observer = new IntersectionObserver(
      function (entries) {
        var active = entries
          .filter(function (entry) {
            return entry.isIntersecting;
          })
          .sort(function (a, b) {
            return b.intersectionRatio - a.intersectionRatio;
          })[0];
        if (!active) return;
        links.forEach(function (link, id) {
          if (id === active.target.id) {
            link.setAttribute("aria-current", "location");
          } else {
            link.removeAttribute("aria-current");
          }
        });
      },
      { rootMargin: "-20% 0px -65% 0px", threshold: [0.05, 0.25, 0.5] }
    );
    document.querySelectorAll(".study-section").forEach(function (section) {
      observer.observe(section);
    });
  }

  function validateData(data) {
    var requiredArrays = [
      "briefing",
      "companyFacts",
      "companySections",
      "stories",
      "process",
      "technical",
      "interviewQuestions",
      "questionsToAsk",
      "checklist",
      "sources"
    ];
    if (!data || typeof data !== "object" || !data.meta || !data.hero || !data.role) {
      throw new Error("Preparation data is missing required objects.");
    }
    requiredArrays.forEach(function (key) {
      if (!Array.isArray(data[key])) {
        throw new Error("Preparation data is missing array: " + key);
      }
    });
    if (!data.dueDiligence || !data.clientCase || !data.fit) {
      throw new Error("Preparation data is missing a required section.");
    }
  }

  function render(data) {
    state.data = data;
    state.sources = new Map(
      data.sources.map(function (source) {
        return [source.id, source];
      })
    );
    renderHero(data);
    renderQuick(data);
    renderCompany(data);
    renderRole(data);
    renderStories(data);
    renderProcess(data);
    renderTechnical(data);
    renderQuestions(data);
    renderAsk(data);
    renderDiligence(data);
    renderChecklist(data);
    renderSources(data);
    bindControls();
    bindSectionObserver();
    applyFilters();
  }

  async function start() {
    var status = document.getElementById("load-status");
    try {
      var response = await fetch("./data/prep.json", {
        cache: "no-store",
        credentials: "same-origin"
      });
      if (!response.ok) {
        throw new Error("HTTP " + response.status + " while loading preparation data.");
      }
      var data = await response.json();
      validateData(data);
      render(data);
      status.hidden = true;
    } catch (error) {
      status.classList.add("is-error");
      status.textContent =
        "The preparation guide could not load. Refresh the page. If you opened the files locally, serve this folder over HTTP. " +
        (error && error.message ? error.message : "");
      console.error(error);
    }
  }

  start();
})();
