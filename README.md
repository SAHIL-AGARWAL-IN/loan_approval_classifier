# LendOptima AI - Loan Approval Analytics & Prediction

[![Deployed to Vercel](https://img.shields.io/badge/Deployed%20to-Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://lend-optima-ai.vercel.app/)
&nbsp;
[![Live Demo](https://img.shields.io/badge/Live%20Demo-LendOptima%20AI-6366f1?style=for-the-badge&logo=google-chrome&logoColor=white)](https://lend-optima-ai.vercel.app/)


LendOptima AI is an interactive, premium machine learning classifier dashboard built to analyze and predict loan eligibility. Running entirely in the browser (client-side), the app uses a trained **Logistic Regression** model ($88\%$ accuracy, $83.6\%$ recall, and $81.0\%$ F1-Score) to perform real-time loan underwriting risk estimation.

## 🚀 Key Features

* **Overview Dashboard:** Provides rich visual analytics from the dataset, including Credit Score Bracket rates, Doughnut split charts, Loan Purpose bar charts, and Debt-to-Income (DTI) probability curves.
* **Eligibility Predictor:** Adjust financial & demographic parameters (monthly income, co-applicant support, credit score, DTI, savings, collateral, age, dependents, employment status) using sleek sliders to run ML predictions instantly. Features a circular visual gauge and highlights the primary decision drivers (+/- log-odds weight) dynamically.
* **Data Explorer:** Offers a paginated, searchable datatable of applicant profiles parsed dynamically from local CSV datasets.
* **Model Insights:** Showcases performance metrics (accuracy, precision, recall, F1), details the architectural blueprint and mathematical scaling bounds ($Credit\_Score^2$, $DTI\_Ratio^2$, $\ln(Income + 1)$), displays an interactive Confusion Matrix, and maps feature weights on a dynamic bar chart.
* **Model Comparison Modal:** Provides group performance comparisons (Logistic Regression vs. Gaussian Naive Bayes vs. KNN) and explains the architectural rationale behind model selection.
* **Light / Dark Mode:** Full UI theme support toggled instantly via a header action control.

## 🛠️ Technology Stack

* **Core:** HTML5, CSS3 (Vanilla design tokens, variables, custom transitions), JavaScript ES6.
* **Visualization:** [Chart.js](https://www.chartjs.org/) for analytics, performance, and weight charts.
* **Math Rendering:** [MathJax](https://www.mathjax.org/) for beautiful typesetting of LaTeX model equations.
* **CSV Parsing:** [PapaParse](https://www.papaparse.com/) for fast client-side browser file parsing.
* **Icons:** [FontAwesome 6.4.0](https://fontawesome.com/) vector icons.

## ⚙️ Setup & Local Execution

Because the dashboard parses local files (such as `loan_approval_data.csv`) dynamically, running it requires a local web server (to satisfy browser CORS security policies).

1. Clone or download the repository directory.
2. Open a terminal in the folder and start a local static server:
   ```bash
   # Using Python 3
   python -m http.server 8181
   
   # Or using Node.js (http-server)
   npx http-server -p 8181
   ```
3. Open your browser and navigate to:
   ```
   http://localhost:8181/
   ```

## 📊 ML Model Implementation

The client-side classifier uses a serialized Logistic Regression model configuration. Feature scaling parameters (mean/standard deviation scaling boundaries) and categorical mapping parameters are calculated client-side inside `app.js` using statistics generated from training data, ensuring identical processing to standard Scikit-Learn pipelines:

$$ \text{LogOdds}(z) = \beta_0 + \sum_{i=1}^{28} \beta_i \left( \frac{X_i - \mu_i}{\sigma_i} \right) $$
$$ P(\text{Approved}) = \frac{1}{1 + e^{-z}} $$
