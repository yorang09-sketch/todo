function getTodayString() {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, "0");
      const day = String(now.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    }

    const TODAY_STR = getTodayString();

    const firebaseConfig = {
      apiKey: "AIzaSyD8NjyVXdgfA0yJ2jgLqMB-gEMk4Eu3Jyc",
      authDomain: "to-do-92650.firebaseapp.com",
      databaseURL: "https://to-do-92650-default-rtdb.firebaseio.com",
      projectId: "to-do-92650",
      storageBucket: "to-do-92650.firebasestorage.app",
      messagingSenderId: "90205405198",
      appId: "1:90205405198:web:d68956669af16cf0ce3c5f",
      measurementId: "G-0Z8YJ4TLD0"
    };

    firebase.initializeApp(firebaseConfig);
    const database = firebase.database();
    const todosRef = database.ref("todos");

    let todos = [];

    let currentView = "list"; // 'list' 또는 'calendar'
    let currentCalendarDate = new Date(); // 달력 탐색용 기준 날짜
    let currentTodoFilter = "all";

    const todayDisplay = document.getElementById("todayDisplay");
    const todayTodoList = document.getElementById("todayTodoList");
    const allTodoList = document.getElementById("allTodoList");
    const todayCount = document.getElementById("todayCount");
    const allCount = document.getElementById("allCount");
    const todoFilterButtons = document.querySelectorAll("[data-todo-filter]");

    const listViewBtn = document.getElementById("listViewBtn");
    const calendarViewBtn = document.getElementById("calendarViewBtn");
    const listViewSection = document.getElementById("listViewSection");
    const calendarViewSection = document.getElementById("calendarViewSection");
    
    const calendarGrid = document.getElementById("calendarGrid");
    const calendarMonthTitle = document.getElementById("calendarMonthTitle");
    const prevMonthBtn = document.getElementById("prevMonthBtn");
    const nextMonthBtn = document.getElementById("nextMonthBtn");

    const modal = document.getElementById("todoModal");
    const modalTitleText = document.getElementById("modalTitleText");
    const modalSubmitBtn = document.getElementById("modalSubmitBtn");
    const openModalBtn = document.getElementById("openModalBtn");
    const closeModalBtn = document.getElementById("closeModalBtn");
    const cancelModalBtn = document.getElementById("cancelModalBtn");
    const toggleCompleteBtn = document.getElementById("toggleCompleteBtn");
    const todoForm = document.getElementById("todoForm");

    const idInput = document.getElementById("todoId");
    const titleInput = document.getElementById("todoTitle");
    const descInput = document.getElementById("todoDesc");
    const dateInput = document.getElementById("todoDate");
    const dayTodosModal = document.getElementById("dayTodosModal");
    const dayTodosTitle = document.getElementById("dayTodosTitle");
    const dayTodoList = document.getElementById("dayTodoList");
    const addTodoForDayBtn = document.getElementById("addTodoForDayBtn");
    let selectedDay = TODAY_STR;

    todayDisplay.textContent = `오늘 날짜: ${TODAY_STR}`;

    function createTodoElement(todo) {
      const item = document.createElement("div");
      item.className = `todo-item ${todo.completed ? "completed" : ""}`;

      item.innerHTML = `
        <div class="todo-left">
          <input type="checkbox" class="todo-checkbox" ${todo.completed ? "checked" : ""} />
          <div class="todo-content">
            <div class="todo-header-row">
              <span class="todo-title">${escapeHTML(todo.title)}</span>
              <span class="todo-date">${todo.date}</span>
            </div>
            ${todo.description ? `<p class="todo-desc">${escapeHTML(todo.description)}</p>` : ""}
          </div>
        </div>
        <button class="btn-delete" title="삭제">삭제</button>
      `;

      item.addEventListener("click", (e) => {
        if (e.target.tagName === "INPUT" || e.target.classList.contains("btn-delete")) {
          return;
        }
        openEditModal(todo);
      });

      const checkbox = item.querySelector(".todo-checkbox");
      checkbox.addEventListener("change", async () => {
        try {
          await todosRef.child(todo.id).update({ completed: checkbox.checked });
        } catch (error) {
          checkbox.checked = todo.completed;
          showFirebaseError(error);
        }
      });

      const deleteBtn = item.querySelector(".btn-delete");
      deleteBtn.addEventListener("click", async (e) => {
        e.stopPropagation();
        try {
          await todosRef.child(todo.id).remove();
        } catch (error) {
          showFirebaseError(error);
        }
      });

      return item;
    }

    function escapeHTML(str) {
      return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
    }

    // 목록 뷰 렌더링
    function renderListView() {
      const sortedTodos = [...todos].sort((a, b) => a.date.localeCompare(b.date));

      const todayTodos = sortedTodos.filter((todo) => todo.date === TODAY_STR);
      todayCount.textContent = todayTodos.length;
      todayTodoList.innerHTML = "";

      if (todayTodos.length === 0) {
        todayTodoList.innerHTML = `<p class="empty-message">오늘 예정된 할 일이 없습니다.</p>`;
      } else {
        todayTodos.forEach((todo) => {
          todayTodoList.appendChild(createTodoElement(todo));
        });
      }

      const filteredTodos = sortedTodos.filter((todo) => {
        if (currentTodoFilter === "completed") return todo.completed;
        if (currentTodoFilter === "incomplete") return !todo.completed;
        return true;
      });

      allCount.textContent = filteredTodos.length;
      allTodoList.innerHTML = "";

      if (filteredTodos.length === 0) {
        const emptyMessage = sortedTodos.length === 0
          ? "등록된 할 일이 없습니다. 새로운 할 일을 추가해보세요!"
          : currentTodoFilter === "completed"
            ? "완료된 할 일이 없습니다."
            : currentTodoFilter === "incomplete"
              ? "미완료 할 일이 없습니다."
              : "표시할 할 일이 없습니다.";
        allTodoList.innerHTML = `<p class="empty-message">${emptyMessage}</p>`;
      } else {
        filteredTodos.forEach((todo) => {
          allTodoList.appendChild(createTodoElement(todo));
        });
      }

      todoFilterButtons.forEach((button) => {
        const isActive = button.dataset.todoFilter === currentTodoFilter;
        button.classList.toggle("active", isActive);
        button.setAttribute("aria-pressed", String(isActive));
      });
    }

    // 달력 뷰 렌더링
    function renderCalendarView() {
      const year = currentCalendarDate.getFullYear();
      const month = currentCalendarDate.getMonth();

      calendarMonthTitle.textContent = `${year}년 ${month + 1}월`;
      calendarGrid.innerHTML = "";

      // 요일 헤더 추가
      const dayNames = ["일", "월", "화", "수", "목", "금", "토"];
      dayNames.forEach(name => {
        const dayHeader = document.createElement("div");
        dayHeader.className = "calendar-day-name";
        dayHeader.textContent = name;
        calendarGrid.appendChild(dayHeader);
      });

      const firstDayIndex = new Date(year, month, 1).getDay();
      const lastDay = new Date(year, month + 1, 0).getDate();
      const prevLastDay = new Date(year, month, 0).getDate();

      // 지난달 빈 칸 채우기
      for (let i = firstDayIndex - 1; i >= 0; i--) {
        const cell = document.createElement("div");
        cell.className = "calendar-cell other-month";
        const dateNum = document.createElement("div");
        dateNum.className = "calendar-date-number";
        dateNum.textContent = prevLastDay - i;
        cell.appendChild(dateNum);
        calendarGrid.appendChild(cell);
      }

      // 이번달 날짜 채우기
      for (let day = 1; day <= lastDay; day++) {
        const cell = document.createElement("div");
        cell.className = "calendar-cell selectable-day";

        const monthStr = String(month + 1).padStart(2, "0");
        const dayStr = String(day).padStart(2, "0");
        const dateString = `${year}-${monthStr}-${dayStr}`;
        cell.tabIndex = 0;
        cell.setAttribute("role", "button");
        cell.setAttribute("aria-label", `${dateString} 할 일 보기`);
        cell.addEventListener("click", () => openDayTodos(dateString));
        cell.addEventListener("keydown", (event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            openDayTodos(dateString);
          }
        });

        if (dateString === TODAY_STR) {
          cell.classList.add("today");
        }

        const dateNum = document.createElement("div");
        dateNum.className = "calendar-date-number";
        dateNum.textContent = day;
        cell.appendChild(dateNum);

        // 해당 일자에 등록된 할 일 필터링
        const dayTodos = todos.filter(t => t.date === dateString);
        if (dayTodos.length > 0) {
          const itemsContainer = document.createElement("div");
          itemsContainer.className = "calendar-todo-items";

          dayTodos.forEach(todo => {
            const chip = document.createElement("div");
            chip.className = `calendar-todo-chip ${todo.completed ? "completed" : ""}`;
            chip.textContent = todo.title;
            chip.title = todo.title; // 말풍선 툴팁
            
            // 칩 클릭 시 해당 할 일 수정/상세 모달 열기
            chip.addEventListener("click", (event) => {
              event.stopPropagation();
              openEditModal(todo);
            });

            itemsContainer.appendChild(chip);
          });

          cell.appendChild(itemsContainer);
        }

        calendarGrid.appendChild(cell);
      }

      // 다음달 빈 칸 채우기 (총 35칸 또는 42칸 맞추기)
      const totalCells = firstDayIndex + lastDay;
      const nextDaysCount = totalCells <= 35 ? 35 - totalCells : 42 - totalCells;
      for (let i = 1; i <= nextDaysCount; i++) {
        const cell = document.createElement("div");
        cell.className = "calendar-cell other-month";
        const dateNum = document.createElement("div");
        dateNum.className = "calendar-date-number";
        dateNum.textContent = i;
        cell.appendChild(dateNum);
        calendarGrid.appendChild(cell);
      }
    }

    function renderApp() {
      // 오늘의 할 일은 항상 최신 상태 반영
      const sortedTodos = [...todos].sort((a, b) => a.date.localeCompare(b.date));
      const todayTodos = sortedTodos.filter((todo) => todo.date === TODAY_STR);
      todayCount.textContent = todayTodos.length;
      todayTodoList.innerHTML = "";

      if (todayTodos.length === 0) {
        todayTodoList.innerHTML = `<p class="empty-message">오늘 예정된 할 일이 없습니다.</p>`;
      } else {
        todayTodos.forEach((todo) => {
          todayTodoList.appendChild(createTodoElement(todo));
        });
      }

      // 현재 선택된 뷰에 따라 다르게 렌더링
      if (currentView === "list") {
        listViewSection.style.display = "block";
        calendarViewSection.style.display = "none";
        listViewBtn.classList.add("active");
        calendarViewBtn.classList.remove("active");
        renderListView();
      } else {
        listViewSection.style.display = "none";
        calendarViewSection.style.display = "block";
        calendarViewBtn.classList.add("active");
        listViewBtn.classList.remove("active");
        renderCalendarView();
      }
    }

    // 뷰 전환 버튼 이벤트 리스너
    listViewBtn.addEventListener("click", () => {
      currentView = "list";
      renderApp();
    });

    calendarViewBtn.addEventListener("click", () => {
      currentView = "calendar";
      renderApp();
    });

    todoFilterButtons.forEach((button) => {
      button.addEventListener("click", () => {
        currentTodoFilter = button.dataset.todoFilter;
        renderApp();
      });
    });

    // 달력 월 이동 버튼
    prevMonthBtn.addEventListener("click", () => {
      currentCalendarDate.setMonth(currentCalendarDate.getMonth() - 1);
      renderCalendarView();
    });

    nextMonthBtn.addEventListener("click", () => {
      currentCalendarDate.setMonth(currentCalendarDate.getMonth() + 1);
      renderCalendarView();
    });

    // 새 할 일 추가 모달 열기
    function openCreateModal() {
      openCreateModalForDate(TODAY_STR);
    }

    function openCreateModalForDate(date) {
      todoForm.reset();
      idInput.value = "";
      modalTitleText.textContent = "새로운 할 일 추가";
      modalSubmitBtn.textContent = "추가하기";
      dateInput.value = date;
      toggleCompleteBtn.style.display = "none";
      modal.classList.add("active");
      titleInput.focus();
    }

    function openDayTodos(date) {
      selectedDay = date;
      dayTodosTitle.textContent = `${date} 할 일`;
      dayTodoList.innerHTML = "";
      const dayTodos = todos
        .filter((todo) => todo.date === date)
        .sort((a, b) => a.title.localeCompare(b.title, "ko"));

      if (dayTodos.length === 0) {
        dayTodoList.innerHTML = '<p class="empty-message">이 날짜에 등록된 할 일이 없습니다.</p>';
      } else {
        dayTodos.forEach((todo) => dayTodoList.appendChild(createTodoElement(todo)));
      }

      dayTodosModal.classList.add("active");
      dayTodosModal.setAttribute("aria-hidden", "false");
    }

    function closeDayTodos() {
      dayTodosModal.classList.remove("active");
      dayTodosModal.setAttribute("aria-hidden", "true");
    }

    // 기존 할 일 수정 모달 열기
    function openEditModal(todo) {
      todoForm.reset();
      idInput.value = todo.id;
      titleInput.value = todo.title;
      descInput.value = todo.description || "";
      dateInput.value = todo.date;
      modalTitleText.textContent = "할 일 상세 및 수정";
      modalSubmitBtn.textContent = "수정하기";
      
      toggleCompleteBtn.style.display = "block";
      if (todo.completed) {
        toggleCompleteBtn.textContent = "미완료로 만들기";
      } else {
        toggleCompleteBtn.textContent = "완료하기";
      }

      modal.classList.add("active");
      titleInput.focus();
    }

    function closeModal() {
      modal.classList.remove("active");
    }

    openModalBtn.addEventListener("click", openCreateModal);
    closeModalBtn.addEventListener("click", closeModal);
    cancelModalBtn.addEventListener("click", closeModal);

    document.getElementById("closeDayTodosBtn").addEventListener("click", closeDayTodos);
    document.getElementById("closeDayTodosFooterBtn").addEventListener("click", closeDayTodos);
    addTodoForDayBtn.addEventListener("click", () => {
      closeDayTodos();
      openCreateModalForDate(selectedDay);
    });
    dayTodosModal.addEventListener("click", (event) => {
      if (event.target === dayTodosModal) closeDayTodos();
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        closeModal();
        closeDayTodos();
      }
    });

    modal.addEventListener("click", (e) => {
      if (e.target === modal) closeModal();
    });

    toggleCompleteBtn.addEventListener("click", async () => {
      const id = idInput.value;
      if (!id) return;

      const target = todos.find((todo) => todo.id === id);
      if (!target) return;

      try {
        await todosRef.child(id).update({ completed: !target.completed });
        closeModal();
      } catch (error) {
        showFirebaseError(error);
      }
    });

    todoForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const id = idInput.value;
      const title = titleInput.value.trim();
      const description = descInput.value.trim();
      const date = dateInput.value;

      if (!title || !date) return;

      try {
        if (id) {
          await todosRef.child(id).update({ title, description, date });
        } else {
          await todosRef.push({
            title,
            description,
            date,
            completed: false,
          });
        }

        closeModal();
      } catch (error) {
        showFirebaseError(error);
      }
    });

    function showFirebaseError(error) {
      console.error("Firebase 요청 실패:", error);
      alert("Firebase에 연결하거나 저장하지 못했습니다. 인터넷 연결과 Realtime Database 규칙을 확인해 주세요.");
    }

    renderApp();

    todosRef.on(
      "value",
      (snapshot) => {
        const data = snapshot.val() || {};
        todos = Object.entries(data)
          .filter(([, todo]) => todo && typeof todo === "object")
          .map(([id, todo]) => ({
            id,
            title: todo.title || "",
            description: todo.description || "",
            date: todo.date || "",
            completed: Boolean(todo.completed),
          }))
          .filter((todo) => todo.title && todo.date);
        renderApp();
      },
      showFirebaseError
    );
