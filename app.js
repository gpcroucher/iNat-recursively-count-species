const nameForm = document.getElementById("name-form");
const IDForm = document.getElementById("id-form");
const briefOutput = document.getElementById("brief-output");
const fullOutput = document.getElementById("full-output");
const rootTaxon = document.getElementById("root-taxon");

nameForm.addEventListener("submit", handleNameSubmit);
IDForm.addEventListener("submit", handleIDSubmit);

async function handleNameSubmit(event) {
  event.preventDefault();
  const submission = Object.fromEntries(new FormData(event.target));
  const parentTaxon = await getTaxonByName(
    submission.taxonName,
    submission.kingdom
  );
  rootTaxon.innerHTML = "";

  rootTaxon.id = parentTaxon.id;
  getSpeciesRecursively(parentTaxon);
}

async function handleIDSubmit(event) {
  event.preventDefault();
  const submission = Object.fromEntries(new FormData(event.target));
  let parentTaxon = await getTaxonByID(submission.taxonID);
  rootTaxon.id = parentTaxon.id;
  getSpeciesRecursively(parentTaxon);
}

async function getSpeciesRecursively(parentTaxon) {
  console.log("getting species recursively. ID:", parentTaxon);
  let directChildTaxa;
  if (parentTaxon) {
    directChildTaxa = await getAllChildTaxa(parentTaxon);
  } else {
    briefOutput.innerHTML = "Taxon not found!";
    return false;
  }

  let parentList = document.getElementById(parentTaxon.id);
  directChildTaxa.forEach((element) => {
    let newElement;
    let parentNameElement;
    if (element.rank_level > 10) {
      // if the taxon is above species
      newElement = document.createElement("ol");
      newElement.id = element.id;
      parentList.appendChild(newElement);
      parentNameElement = document.createElement("p");
      parentNameElement.innerHTML = `${element.name} (${
        element.preferred_common_name
          ? element.preferred_common_name
          : "no common name"
      })`;
      parentNameElement.classList.add("group-name");
      newElement.appendChild(parentNameElement);
      getSpeciesRecursively(element);
    } else {
      // if the taxon is a species (or lower but that shouldn't happen?)
      newElement = document.createElement("li");
      newElement.id = element.id;
      newElement.innerHTML = `${element.name} (${
        element.preferred_common_name
          ? element.preferred_common_name
          : "no common name"
      })`;
      parentList.appendChild(newElement);
    }
  });
}

// takes name and kingdom as strings and returns a taxon object
async function getTaxonByName(name, kingdom) {
  let kingdomID = "";
  switch (kingdom) {
    case "Animals":
      kingdomID = 1;
      break;
    case "Plants":
      kingdomID = 47126;
      break;
    case "Fungi":
      kingdomID = 47170;
      break;
  }
  const response = await fetch(
    `https://api.inaturalist.org/v1/taxa?q=${name}&taxon_id=${kingdomID}&per_page=200&order=asc&order_by=id`
  );
  const json = await response.json();
  console.log("raw json from getTaxonByName request:", json);
  if (json.results.length > 0) {
    console.log(
      `got taxon ${
        (json.results[0].id, json.results[0].name)
      } from name ${name}`
    );
    return json.results[0];
  } else {
    return false;
  }
}

async function getTaxonByID(ID) {
  const response = await fetch(`https://api.inaturalist.org/v1/taxa/${ID}`);
  const json = await response.json();
  console.log("raw json from getTaxonByID request:", json);
  if (json.results.length > 0) {
    console.log(
      `got taxon ${(json.results[0].id, json.results[0].name)} from ID ${ID}`
    );
    return json.results[0];
  } else {
    return false;
  }
}

async function getAllChildTaxa(parentTaxon) {
  async function getPageOfChildTaxa(parentID, page) {
    const response = await fetch(
      `https://api.inaturalist.org/v1/taxa?parent_id=${parentID}&page=${page}&per_page=200&order=asc&order_by=id`
    );
    const json = await response.json();
    console.log("raw json from getPageOfChildTaxa request:", json);
    return json;
  }

  let validTaxa = [];
  let parentID = parentTaxon.id;
  let resultsJSON = await getPageOfChildTaxa(parentID, 1);
  let results = resultsJSON.results;
  for (const taxon of results) {
    if (!taxon.extinct) {
      validTaxa.push(taxon);
    }
  }

  let length = results.length;
  let counter = 2;
  while (length >= 200) {
    resultsJSON = await getPageOfChildTaxa(parentID, counter);
    results = resultsJSON.results;
    console.log(results);
    for (taxon of results) {
      if (!taxon.extinct) {
        validTaxa.push(taxon);
      }
    }
    counter++;
    length = results.length;
  }

  console.log(validTaxa.length, "valid taxa from getAllChildTaxa: ", validTaxa);
  return validTaxa;
}
