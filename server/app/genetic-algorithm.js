var evolveGa = require("evolve-ga");
var createCollage = require("@settlin/collage");
var jsonDOTA = require("./assets/dota/champions.json");
var json = require("./assets/champions.json");
var fs = require("fs");
const uploadFile = require("./uploadFile");
let generation = 1;
let execution = 1;
let finalFitvalue = 0;
let allChromosomes = [];
let totalChampions = 141;
let POPULATION_SIZE;
let MUTATION_CHANCE;
let MAX_GENERATIONS;
let MAX_EXECUTIONS = 3;
let COMPOSITION_STRATEGY;
let MAX_FIT_VALUE = 3633;
let filePathReports =
  "reports/" +
  COMPOSITION_STRATEGY +
  "/PS-" +
  POPULATION_SIZE +
  "__MC-" +
  MUTATION_CHANCE +
  "__MG-" +
  MAX_GENERATIONS +
  ".csv";
let filePathTimeReports =
  "time-reports/" +
  COMPOSITION_STRATEGY +
  "/PS-" +
  POPULATION_SIZE +
  "__MC-" +
  MUTATION_CHANCE +
  "__MG-" +
  MAX_GENERATIONS +
  ".csv";
var fileName = "";

class GeneticAlgorithm {
  constructor() {
    this.genetic = this.genetic.bind(this);

    this.crossOverFunction = this.crossOverFunction.bind(this);
    this.mutationFunction = this.mutationFunction.bind(this);
    this.fitnessFunction = this.fitnessFunction.bind(this);
    this.selectionFunction = this.selectionFunction.bind(this);

    this.numberCompare = this.numberCompare.bind(this);
    this.validChromosome = this.validChromosome.bind(this);
    this.validCompositionFunction = this.validCompositionFunction.bind(this);
    this.validRolesFunction = this.validRolesFunction.bind(this);
    this.showCompositionInfo = this.showCompositionInfo.bind(this);
  }

  validCompositionFunction(chromosome) {
    let winrateComposition = 0;

    let hasCarry = false;
    let winrateCarry = 0;

    let hasSupp = false;
    let winrateSupp = 0;

    let hasMid = false;
    let winrateMid = 0;

    let hasTop = false;
    let winrateTop = 0;

    let hasJungle = false;
    let winrateJungle = 0;

    chromosome.genes.map(gene => {
      json.map(function(champion) {
        if (gene === champion.id) {
          Object.entries(champion.infos.winrate).forEach(([role, winrate]) => {
            if (role === "top" && !hasTop) {
              hasTop = true;
              winrateTop = winrate;
              return;
            }

            if (role === "jungle" && !hasJungle) {
              hasJungle = true;
              winrateJungle = winrate;
              return;
            }

            if (role === "mid" && !hasMid) {
              hasMid = true;
              winrateMid = winrate;
              return;
            }

            if (role === "carry" && !hasCarry) {
              hasCarry = true;
              winrateCarry = winrate;
              return;
            }

            if (role === "support" && !hasSupp) {
              hasSupp = true;
              winrateSupp = winrate;
              return;
            }
          });
        }

        if (hasCarry && hasSupp && hasMid && hasTop && hasJungle) {
          winrateComposition =
            (winrateCarry +
              winrateSupp +
              winrateMid +
              winrateTop +
              winrateJungle) /
            5;
        }
      });
    });

    return winrateComposition;
  }

  validRolesFunction(champion, strategies, multiplier) {
    if (!champion.roles) {
      return multiplier;
    }

    let hasStrategy = champion.roles.filter(value => strategies.includes(value))
      .length;

    if (!hasStrategy) {
      return multiplier;
    }

    return +(0.1 + multiplier).toFixed(12);
  }

  mutationFunction(chromosome, possibleGenes) {
    var mutatedGenes = chromosome.genes.slice();
    var geneToMutateIndex = Math.floor(Math.random() * mutatedGenes.length);
    var possibleGenesFiltered = possibleGenes.filter(function(gene) {
      return gene !== mutatedGenes[geneToMutateIndex];
    });
    mutatedGenes[geneToMutateIndex] =
      possibleGenesFiltered[
        Math.floor(Math.random() * possibleGenesFiltered.length)
      ];
    var aux = [];
    aux[1] = {
      fitness: 0,
      genes: mutatedGenes
    };

    if (!this.validChromosome(aux[1])) {
      return {
        fitness: chromosome.fitness,
        genes: mutatedGenes
      };
    } else {
      return chromosome;
    }
  }

  crossOverFunction(chromosomes) {
    var offspring = [];
    var aux = [];

    for (var i = 0; i < chromosomes.length; i++) {
      var crossOverPoint = Math.floor(
        Math.random() * chromosomes[i].genes.length
      );
      var parentA = chromosomes[Math.floor(Math.random() * chromosomes.length)];
      var parentB = chromosomes[Math.floor(Math.random() * chromosomes.length)];
      aux[1] = {
        fitness: 0,
        genes: parentA.genes
          .slice(0, crossOverPoint)
          .concat(parentB.genes.slice(crossOverPoint))
      };
      if (!this.validChromosome(aux[1])) {
        offspring.push({
          fitness: 0,
          genes: parentA.genes
            .slice(0, crossOverPoint)
            .concat(parentB.genes.slice(crossOverPoint))
        });
      }
    }

    return offspring;
  }

  selectionFunction(chromosomes) {
    chromosomes = chromosomes
      .sort(function(a, b) {
        return b.fitness - a.fitness;
      })
      .slice(0, Math.ceil(chromosomes.length / 2));
    chromosomes.map((chromosome, i) => {
      if (this.validChromosome(chromosome)) {
        chromosomes.splice(i, 1);
      }
    });
    return chromosomes;
  }

  fitnessFunction(chromosome) {
    allChromosomes.push(chromosome);

    switch (COMPOSITION_STRATEGY) {
      case "hardengage":
        var fitvalueHardEngage = 0;
        fitvalueHardEngage = this.validCompositionFunction(chromosome);
        var multiplier = 1.0;
        var self = this;

        chromosome.genes.map(function(gene) {
          json.map(champion => {
            if (gene === champion.id) {
              multiplier = self.validRolesFunction(
                champion,
                ["Hard Engage"],
                multiplier
              );
            }
          });
        });

        fitvalueHardEngage = (fitvalueHardEngage * multiplier) / MAX_FIT_VALUE;

        if (fitvalueHardEngage > finalFitvalue) {
          finalFitvalue = fitvalueHardEngage;
          this.finalChromosome = chromosome;
        }

        return fitvalueHardEngage;
      case "teamfight":
        var fitvalueTeamFight = this.validCompositionFunction(chromosome);
        var multiplier = 1.0;
        var self = this;

        chromosome.genes.map(function(gene) {
          json.map(champion => {
            if (gene === champion.id) {
              multiplier = self.validRolesFunction(
                champion,
                ["Area of Effect"],
                multiplier
              );
            }
          });
        });

        fitvalueTeamFight = (fitvalueTeamFight * multiplier) / MAX_FIT_VALUE;

        if (fitvalueTeamFight > finalFitvalue) {
          finalFitvalue = fitvalueTeamFight;
          this.finalChromosome = chromosome;
        }

        return fitvalueTeamFight;
      case "pusher":
        var fitvaluePusher = this.validCompositionFunction(chromosome);
        var multiplier = 1.0;
        var self = this;

        chromosome.genes.map(function(gene) {
          json.map(champion => {
            if (gene === champion.id) {
              multiplier = self.validRolesFunction(
                champion,
                ["Poke", "Waveclear"],
                multiplier
              );
            }
          });
        });

        fitvaluePusher = (fitvaluePusher * multiplier) / MAX_FIT_VALUE;

        if (fitvaluePusher > finalFitvalue) {
          finalFitvalue = fitvaluePusher;
          this.finalChromosome = chromosome;
        }

        return fitvaluePusher;
    }
  }

  validChromosome(chromosome) {
    var control = false;
    var genes = chromosome.genes;

    genes.forEach(function(item) {
      var filteredArray = genes.filter(function(itemFilter) {
        return item === itemFilter;
      });
      if (filteredArray.length > 1) {
        control = true;
      }
    });

    return control;
  }

  showCompositionInfo() {
    var championsIcons = [];
    var parsedJson = JSON.parse(JSON.stringify(json));

    if (this.finalChromosome) {
      this.finalChromosome.genes.forEach(function(item) {
        var aux = parsedJson.find(function(champion) {
          return champion.id === item;
        });
        if (aux) {
          championsIcons.push(aux.icon);
        }
      });
    }

    var options = {
      sources: championsIcons,
      width: 5,
      height: 1,
      imageWidth: 120,
      imageHeight: 120
    };

    createCollage(options).then(async canvas => {
      var src = canvas.jpegStream();
      const blobName = `${fileName}.png`;
      var dest = fs.createWriteStream(blobName);

      src.pipe(dest);
      src.on("end", function() {
        uploadFile(blobName);
      });
    });
  }

  writeSecondsOnFile(start, end, duration) {
    fs.appendFileSync(
      filePathTimeReports,
      execution + ";" + start + ";" + end + ";" + duration + " \r\n"
    );
  }

  createReportFiles() {
    fs.writeFile(filePathReports, "", function() {});
    fs.writeFile(filePathTimeReports, "", function() {});
  }

  genetic() {
    var start = new Date();
    this.algorithm.resetPopulation();

    while (generation <= MAX_GENERATIONS) {
      this.algorithm.run();
      this.writeGenerationsOnFile();
      this.allChromosomes = [];
      generation++;
    }

    this.showCompositionInfo();
    this.finalFitvalue = 0;
    var end = new Date();
    this.writeSecondsOnFile(start, end, end.getTime() - start.getTime());
  }

  numberCompare(a, b) {
    return a - b;
  }

  writeFileHeader() {
    fs.appendFileSync(
      filePathReports,
      "execution;generation;chromosome;fitness \r\n"
    );
  }

  writeFileSecondsHeader() {
    fs.appendFileSync(filePathTimeReports, "execution;start;end;duration \r\n");
  }

  writeGenerationsOnFile() {
    allChromosomes.map(function(chromosome) {
      fs.appendFileSync(
        filePathReports,
        execution +
          ";" +
          generation +
          ";" +
          chromosome.genes.sort(this.numberCompare).toString() +
          ";" +
          chromosome.fitness +
          "\r\n"
      );
    });
  }

  writeSecondsOnFile(start, end, duration) {
    fs.appendFileSync(
      filePathTimeReports,
      execution + ";" + start + ";" + end + ";" + duration + " \r\n"
    );
  }

  createReportFiles() {
    fs.writeFile(filePathReports, "", function() {});
    fs.writeFile(filePathTimeReports, "", function() {});
  }

  // createReportFiles();
  // writeFileHeader();
  // writeFileSecondsHeader();

  genetic() {
    var start = new Date();
    this.algorithm.resetPopulation();

    while (generation <= MAX_GENERATIONS) {
      this.algorithm.run();
      // this.writeGenerationsOnFile();
      this.allChromosomes = [];
      generation++;
    }
    this.createReportFiles();
    this.writeFileHeader();
    this.writeFileSecondsHeader();

    this.algorithm = evolveGa.evolve({
      populationSize: POPULATION_SIZE,
      chromosomeLength: 5,
      possibleGenes: champions,
      mutationChance: MUTATION_CHANCE,
      fitnessFunction: this.fitnessFunction,
      selectionFunction: this.selectionFunction,
      crossOverFunction: this.crossOverFunction,
      mutationFunction: this.mutationFunction
    });

    this.showCompositionInfo();
    this.finalFitvalue = 0;
    var end = new Date();
    // this.writeSecondsOnFile(start, end, end.getTime() - start.getTime());
  }

  start(
    strategy,
    maxFitValue,
    populationSize,
    mutationChance,
    maxGenerations,
    bannedGenes
  ) {
    MAX_GENERATIONS = maxGenerations;
    COMPOSITION_STRATEGY = strategy;
    MAX_FIT_VALUE = maxFitValue;
    POPULATION_SIZE = populationSize;
    MUTATION_CHANCE = mutationChance;

    let possibleGenes = Array.apply(null, { length: totalChampions }).map(
      Number.call,
      Number
    );
    let champions = possibleGenes;

    if (bannedGenes) {
      champions = possibleGenes.filter(x => !bannedGenes.includes(x));
    }

    this.algorithm = evolveGa.evolve({
      populationSize: POPULATION_SIZE,
      chromosomeLength: 5,
      possibleGenes: champions,
      mutationChance: MUTATION_CHANCE,
      fitnessFunction: this.fitnessFunction,
      selectionFunction: this.selectionFunction,
      crossOverFunction: this.crossOverFunction,
      mutationFunction: this.mutationFunction
    });

    fileName =
      Math.random()
        .toString(36)
        .substring(2, 15) +
      Math.random()
        .toString(36)
        .substring(2, 15);
    this.genetic();
    return fileName;
  }
}

module.exports = new GeneticAlgorithm();
