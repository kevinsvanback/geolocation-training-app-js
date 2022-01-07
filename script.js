'use strict';

// DOM elements
const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');


// ------ App ------
class App {
  #map;
  #mapZoomLevel = 13;
  #mapEvent;
  #workouts = [];
  constructor() {
    // Get the position
    this._getPosition();

    // Get data from local storage
    this._getLocalStorage();

    // Event handlers
    // Submit form
    form.addEventListener('submit', this._newWorkout.bind(this));
    // Toggle form type
    inputType.addEventListener('change', this._toggleElevationField);
    // Move to marker's postition
    containerWorkouts.addEventListener('click', this._moveToPopup.bind(this));
  }

  // Get the position
  _getPosition() {
    // Get geolocation coords
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(this._loadMap.bind(this), function() {
        // Map not found error message
        alert('Something went wrong reading your GPS position');
      });
    };
  }

  // Load the map
  _loadMap(position) {
    // Storing the position
    const { latitude } = position.coords;
    const { longitude } = position.coords;
    const coords = [latitude, longitude];

    // Leaflet code
    // Set the view to our coords
    this.#map = L.map('map').setView(coords, this.#mapZoomLevel);

    // Theme of the map
    L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(this.#map);

    // Set marker to our coords
    L.marker(coords).addTo(this.#map)
      .bindPopup("You are here.<br> Lookin' good.")
      .openPopup();

    // Handling clicks on map
    this.#map.on('click', this._showForm.bind(this));

    // Need to render markers here because of async problems
    this.#workouts.forEach(work => {
      this._renderWorkoutMarker(work);
    });
  }

  // Clear form fields
  _clearForm() {
    inputDistance.value = inputDuration.value = inputCadence.value = inputElevation.value = '';
  }

  // Show the form
  _showForm(mapE) {
    this.#mapEvent = mapE;
    form.classList.remove('hidden');
    // Auto select distance input field
    inputDistance.focus();
  }

  // Hide the form
  _hideForm() {
    form.style.display = 'none';
    form.classList.add('hidden');
    setTimeout(() => form.style.display = 'grid', 1000);
  }

  // Toggle form type
  _toggleElevationField() {
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
  }

  // Create new workout
  _newWorkout(e) {
    // Helper function instead of if-statement with lots of || checks
    const validInputs = (...inputs) => inputs.every(inp => Number.isFinite(inp));
    // Helper function that check if positive number
    const allPositive = (...inputs) => inputs.every(inp => inp > 0);

    e.preventDefault();

    // Get data from form
    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;
    const latitude = this.#mapEvent.latlng.lat;
    const longitude = this.#mapEvent.latlng.lng;
    const coords = [latitude, longitude];
    let workout;

    // If workout is running, create running object
    if (type === 'running') {
      const cadance = +inputCadence.value;
      // Check if data is valid
      if (!validInputs(distance, duration, cadance) || !allPositive(distance, duration, cadance)) return alert('Inputs have to be positive numbers');

      // Create a new running object
      workout = new Running(coords, distance, duration, cadance);
    };

    // If workout is cycling, create cycling object
    if (type === 'cycling') {
      const elevation = +inputElevation.value;
      if (!validInputs(distance, duration, elevation) || !allPositive(distance, duration)) return alert('Inputs have to be positive numbers');

      // Create a new cycling object
      workout = new Cycling(coords, distance, duration, elevation);
    };

    // Add new onject to workout array
    this.#workouts.push(workout);

    // Render workout on map as marker
    this._renderWorkoutMarker(workout);

    // Render workout on list
    this._renderWorkout(workout);

    // Clear form fields
    this._clearForm();

    // Hide form
    this._hideForm();

    // Set local storage to all workouts
    this._setLocalStorage();
  }

  // Display marker
  _renderWorkoutMarker(workout) {
    L.marker(workout.coords).addTo(this.#map)
      .bindPopup(
        // Additional popup with options on every click
        L.popup({
          autoClose: false,
          closeOnClick: false,
          maxWidth: 250,
          minWidth: 100,
          className: `${workout.type}-popup`
        }))
      // Set the popup content
      .setPopupContent(`${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'} ${workout.description}`)
      .openPopup();
  }

  // Display workout
  _renderWorkout(workout) {
    let html = `
    <li class="workout workout--${workout.type}" data-id="${workout.id}">
          <h2 class="workout__title">${workout.description}</h2>
          <div class="workout__details">
            <span class="workout__icon">${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'}</span>
            <span class="workout__value">${workout.distance}</span>
            <span class="workout__unit">km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⏱</span>
            <span class="workout__value">${workout.duration}</span>
            <span class="workout__unit">min</span>
          </div>
    `;
    if (workout.type === 'running') {
      html += `
      <div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.pace.toFixed(1)}</span>
            <span class="workout__unit">min/km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">🦶🏼</span>
            <span class="workout__value">${workout.cadance}</span>
            <span class="workout__unit">spm</span>
          </div>
        </li>
      `;
    }
    if (workout.type === 'cycling') {
      html += `
      <div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.speed.toFixed(1)}</span>
            <span class="workout__unit">km/h</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⛰</span>
            <span class="workout__value">${workout.elevation}</span>
            <span class="workout__unit">m</span>
          </div>
        </li>
      `;
    }
    form.insertAdjacentHTML('afterend', html);
  }

  // Move to popup
  _moveToPopup(e) {
    // Get the parent with the class of 'workout'
    const workoutEl = e.target.closest('.workout');

    if (!workoutEl) return;

    // Select the workout with the matching id
    const workout = this.#workouts.find(work => work.id === workoutEl.dataset.id);

    // Recenter view on selected marker
    this.#map.setView(workout.coords, this.#mapZoomLevel, {
      animate: true,
      pan: {
        duration: 1
      }
    });
  }

  // Set local storage
  _setLocalStorage() {
    // Set local storage data as JSON strings
    localStorage.setItem('workouts', JSON.stringify(this.#workouts));
  }

  // Get local storage
  _getLocalStorage() {
    // Fetch  local storage data as javascript objects
    const data = JSON.parse(localStorage.getItem('workouts'));

    if (!data) return;

    // Set the workouts to the data
    this.#workouts = data;

    // Display local storage workouts
    this.#workouts.forEach(work => {
      this._renderWorkout(work);
    });
  }

  // Reset workouts from local storage (use app.reset() in console)
  reset() {
    localStorage.removeItem('workouts');
    location.reload();
  }
};
const app = new App();


// ------ Workout ------
class Workout {
  id = (Date.now() + '').slice(-10);
  date = new Date();

  constructor(coords, distance, duration) {
    this.coords = coords; // [latitude, longitude]
    this.distance = distance; // in km
    this.duration = duration; // in minutes
  }

  _setDescription() {
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${months[this.date.getMonth()]} ${this.date.getDate()}`;
  }
};


// ------ Running ------
class Running extends Workout {
  type = 'running';
  constructor(coords, distance, duration, cadance) {
    super(coords, distance, duration);
    this.cadance = cadance;
    this.calcPace();
    this._setDescription();
  }

  calcPace() {
    this.pace = this.duration / this.distance;
    return this.pace;
  }
};


// ------ Cycling ------
class Cycling extends Workout {
  type = 'cycling';
  constructor(coords, distance, duration, elevation) {
    super(coords, distance, duration);
    this.elevation = elevation;
    this.calcSpeed();
    this._setDescription();
  }

  calcSpeed() {
    this.speed = this.distance / (this.duration / 60);
    return this.speed;
  }
};