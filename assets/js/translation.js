
// NOTE manejo de traduccion 
// Agregado es, en

function loadTranslations(language) {
    // Si no se proporciona un idioma, obtener el idioma preferido del navegador
    if (!language) {
        language = navigator.language || navigator.userLanguage;
        language = language.split("-")[0]; // Obtener solo el código del idioma (por ejemplo, "en" de "en-US")
    }

    const url = `assets/lang/${language}.json`;

    loadJSON(url, (translation) => {
        console.log(url)
        console.log(translation)
        const elementsToTranslate = document.querySelectorAll("[lang-trans]");
        elementsToTranslate.forEach((element) => {
            const key = element.getAttribute("lang-trans");
            if (key.includes("-placeholder")) {
                element.placeholder = translation[key];
            } else if (key.includes("-button")) {
                element.textContent = translation[key];
            } else {
                element.innerHTML = translation[key];
            }
        });
    });
}

function loadJSON(url, callback) {
    var xhr = new XMLHttpRequest();
    xhr.overrideMimeType("application/json");
    xhr.open("GET", url, true);
    xhr.onreadystatechange = function () {
        if (xhr.readyState === 4 && xhr.status === 200) {
            callback(JSON.parse(xhr.responseText));
        }
    };
    xhr.send(null);
}


// Obtener el idioma seleccionado previamente del almacenamiento local
var selectedLanguage = localStorage.getItem("lang");

// check si hay idioma previo seleccionado
if (selectedLanguage) {
    $("#language-select").val(selectedLanguage);
    var selectedFlag = $("#language-select option:selected").data("image");
    loadTranslations(selectedLanguage); // Llamar a loadTranslations con el idioma seleccionado
    $(".flag").attr("src", selectedFlag); // Actualizar la imagen de la bandera
}

$("#language-select").on("change", function () {
    var selectedLanguage = $(this).val(); // Obtener el valor del idioma seleccionado en el select
    var selectedFlag = $(this).find("option:selected").data("image"); // Obtener la ruta de la imagen de la bandera seleccionada
    loadTranslations(selectedLanguage); // Llamar a loadTranslations con el idioma seleccionado
    $(".flag").attr("src", selectedFlag); // Actualizar la imagen de la bandera

    // Guardar idioma seleccionado en el almacenamiento local
    localStorage.setItem("lang", selectedLanguage);
});