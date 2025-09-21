const SEARCH_API_URL = "https://www.themealdb.com/api/json/v1/1/filter.php?i=";
const RANDOM_API_URL = "https://www.themealdb.com/api/json/v1/1/random.php";
const LOOKUP_API_URL = "https://www.themealdb.com/api/json/v1/1/lookup.php?i=";

const searchForm = document.getElementById("search-form");
const searchInput = document.getElementById("search-input");
const resultsGrid = document.getElementById("results-grid");
const messageArea = document.getElementById("message-area");
const randomButton = document.getElementById("random-button");
const modal = document.getElementById("recipe-modal");
const modalContent = document.getElementById("recipe-details-content");
const modalCloseBtn = document.getElementById("modal-close-btn");

const RANDOM_RECIPES_COUNT = 6;
let currentRecipes = [];

window.addEventListener("DOMContentLoaded", () => {
  loadRandomRecipes(RANDOM_RECIPES_COUNT);
});

async function loadRandomRecipes(count) {
  showMessage("Loading random recipes...", false, true);
  resultsGrid.innerHTML = "";
  currentRecipes = [];

  try {
    const promises = [];
    for (let i = 0; i < count; i++) {
      promises.push(fetch(RANDOM_API_URL).then((res) => res.json()));
    }
    const results = await Promise.all(promises);
    const meals = results.flatMap((r) => r.meals || []);

    if (meals.length === 0) {
      showMessage("Could not load random recipes. Please try again.", true);
      return;
    }

    currentRecipes = meals;
    clearMessage();
    displayRecipes(meals);
    removeClearSearchButton();
  } catch {
    showMessage("Failed to load random recipes. Please check your connection.", true);
  }
}

searchForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const ingredientsText = searchInput.value.trim();
  if (ingredientsText) {
    searchByIngredient(ingredientsText);
  } else {
    showMessage("Please enter at least one ingredient", true);
  }
});

// ✅ Multi-ingredient search (intersection)
async function searchByIngredient(ingredientsText) {
  const ingredients = ingredientsText
    .split(" ")
    .map((ing) => ing.trim().toLowerCase())
    .filter((ing) => ing.length > 0);

  showMessage(`Searching recipes with ${ingredients.join(", ")}...`, false, true);
  resultsGrid.innerHTML = "";

  try {
    const allResults = await Promise.all(
      ingredients.map((ing) =>
        fetch(`${SEARCH_API_URL}${encodeURIComponent(ing)}`).then((res) => res.json())
      )
    );

    const mealsArrays = allResults.map((r) => r.meals || []);
    if (mealsArrays.some((arr) => arr.length === 0)) {
      showMessage(`No recipes found with all: ${ingredients.join(", ")}`, true);
      return;
    }

    let commonMeals = mealsArrays.reduce((a, b) =>
      a.filter((mealA) => b.some((mealB) => mealB.idMeal === mealA.idMeal))
    );

    if (commonMeals.length === 0) {
      showMessage(`No recipes found with all: ${ingredients.join(", ")}`, true);
      return;
    }

    currentRecipes = commonMeals;
    clearMessage();
    displayRecipes(commonMeals);
    addClearSearchButton();
  } catch {
    showMessage("Error fetching recipes. Try again later.", true);
  }
}

function displayRecipes(meals) {
  resultsGrid.innerHTML = meals
    .map(
      (meal) => `
      <div class="recipe-item" tabindex="0" data-id="${meal.idMeal}">
        <img src="${meal.strMealThumb}" alt="${meal.strMeal}" />
        <h3>${meal.strMeal}</h3>
      </div>
    `
    )
    .join("");

  document.querySelectorAll(".recipe-item").forEach((item) => {
    item.addEventListener("click", () => {
      const mealId = item.getAttribute("data-id");
      getRecipeDetails(mealId);
    });
  });
}

async function getRecipeDetails(mealId) {
  try {
    const response = await fetch(`${LOOKUP_API_URL}${mealId}`);
    const data = await response.json();
    const meal = data.meals[0];
    showRecipeDetails(meal);
  } catch {
    showMessage("Could not load recipe details.", true);
  }
}

function showRecipeDetails(meal) {
  modalContent.innerHTML = `
    <h2 id="modal-title">${meal.strMeal}</h2>
    <img src="${meal.strMealThumb}" alt="${meal.strMeal}" />
    <h3>Ingredients</h3>
    <ul>
      ${getIngredientsList(meal).map((ing) => `<li>${ing}</li>`).join("")}
    </ul>
    <h3>Instructions</h3>
    <p>${meal.strInstructions}</p>
    ${meal.strYoutube ? `<div class="video-wrapper"><a href="${meal.strYoutube}" target="_blank">Watch Video</a></div>` : ""}
  `;

  modal.classList.remove("hidden");
}

function getIngredientsList(meal) {
  const ingredients = [];
  for (let i = 1; i <= 20; i++) {
    const ingredient = meal[`strIngredient${i}`];
    const measure = meal[`strMeasure${i}`];
    if (ingredient && ingredient.trim() !== "") {
      ingredients.push(`${ingredient} - ${measure}`);
    }
  }
  return ingredients;
}

modalCloseBtn.addEventListener("click", () => {
  modal.classList.add("hidden");
});

window.addEventListener("click", (e) => {
  if (e.target === modal) {
    modal.classList.add("hidden");
  }
});

randomButton.addEventListener("click", () => {
  loadRandomRecipes(RANDOM_RECIPES_COUNT);
});

/* --- Helpers --- */
function showMessage(msg, isError = false, isLoading = false) {
  messageArea.textContent = msg;
  messageArea.className = "message";
  if (isError) messageArea.classList.add("error");
  if (isLoading) messageArea.classList.add("loading");
}

function clearMessage() {
  messageArea.textContent = "";
  messageArea.className = "message";
}

function addClearSearchButton() {
  if (!document.getElementById("clear-search-button")) {
    const clearBtn = document.createElement("button");
    clearBtn.id = "clear-search-button";
    clearBtn.textContent = "Clear Search";
    clearBtn.addEventListener("click", () => {
      searchInput.value = "";
      loadRandomRecipes(RANDOM_RECIPES_COUNT);
    });
    searchForm.appendChild(clearBtn);
  }
}

function removeClearSearchButton() {
  const btn = document.getElementById("clear-search-button");
  if (btn) btn.remove();
}
