import express from 'express';
import ejs from 'ejs';
import csv from 'csv';
import fs from 'fs';
import { denodeify } from 'promise';

let readFile = denodeify(fs.readFile);
let parseCsv = denodeify(csv.parse);

let paths = {
  chartjs: require.resolve('chart.js'),
  pleasejs: require.resolve('pleasejs'),
  template: require.resolve('./template.html'),
};

async function readBenchmark(file) {

  var text = await readFile(file, 'utf-8');
  var data = await parseCsv(text);

  var benchmark = { name: data[0][0], dates: [], contestants: [] };

  for (var i = 1; i < data[0].length; i++) {
    benchmark.contestants.push({ 'name': data[0][i].trim(), values: [] });
  }

  for (var i = Math.max(1, data.length - 30); i < data.length; i++) {
    benchmark.dates.push(data[i][0].trim());
    for (var j = 1; j < data[i].length; j++) {
      benchmark.contestants[j-1].values.push(parseFloat(data[i][j]));
    }
  }

  return benchmark;
}

async function readBenchmarks(files) {
  var benchmarks = [];
  for (let file of files) {
    benchmarks.push(await readBenchmark(file));
  }
  return benchmarks;
}

export default function areWeXYet(x, files) {
  let app = express();

  app.engine('html', ejs.renderFile);

  app.get('/', (req, res, next) => {
    readBenchmarks(files)
    .then((benchmarks) => {
      res.render(paths.template, { x, benchmarks });
    }, next);
  });

  app.get('/Chart.js', (req, res) => {
    res.sendFile(paths.chartjs);
  });

  app.get('/please.js', (req, res) => {
    res.sendFile(paths.pleasejs);
  });

  return app;
}

if (!module.parent) {
  let app = areWeXYet('X', [require.resolve('./widgets.csv'), require.resolve('./doodads.csv')]);
  let server = app.listen(3000, () => {
    let {address, port} = server.address();
    console.log(`Listening at http://${address}:${port}`);
  });
}