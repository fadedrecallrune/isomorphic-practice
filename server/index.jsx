import express from "express";
import yields from "express-yields";
import fs from "fs-extra";
import webpack from "webpack";
import { argv } from "optimist";
import { get } from "request-promise";
import { question, questions } from "../data/api-real-url";
import { delay } from "redux-saga";

const PORT = process.env.PORT || 3000;

const app = express();

const useLiveData = argv.useLiveData === "true";

function * getQuestions (){
  let data;
  if (useLiveData) {
      /**
       * If live data is used, contact the external API
       */
      data = yield get(questions,{gzip:true});
  } else {
      /**
       * If live data is not used, read the mock questions file
       */
      data = yield fs.readFile('./data/mock-questions.json',"utf-8");
  }

  /**
   * Parse the data and return it
   */
  return JSON.parse(data);
}

function * getQuestion(question_id) {
  let data;
  if(useLiveData){
    data = yield get(question(question_id), {gzip:true, json:true})
  }else {
    const questions = yield getQuestions()
    const question = questions.item.find(_question => _question.question_id == question_id);
    question.body = `Mock question body: ${question_id}`;
    data = {items:[question]};
  }
  return data;
}

app.get('/api/questions', function * (req,res) {
  const data = yield getQuestions()
  yield delay(150);
  res.json(data)
})

app.get('/api/questions/:id', function * (req, res) {
  const data = yield getQuestion(req.params.id)
  yield delay(150);
  res.send(data)
})

if (process.env.NODE_ENV === "development") {
  const config = require("../webpack.config.dev.babel").default;
  const compiler = webpack(config);

  app.use(
    require("webpack-dev-middleware")(compiler, {
      noInfo: true
    })
  );

  app.use(require("webpack-hot-middleware")(compiler));
}

app.get(["/"], function*(req, res) {
  let index = yield fs.readFile("./public/index.html", "utf-8");
  res.send(index);
});

app.listen(PORT, "0.0.0.0", () => console.log(`app listeing on ${PORT}`));
