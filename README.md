# Loan Approval Classification

This project demonstrates the implementation and comparison of different **Machine Learning Classification algorithms** using **Scikit-learn**.

The goal is to evaluate how different models perform when predicting **whether a loan application will be approved or rejected** based on applicant details.

---

## 📌 Project Overview

Classification models were trained to automate the loan eligibility process. The models explored include:

* **Logistic Regression**
* **K-Nearest Neighbors (KNN)**
* **Gaussian Naive Bayes (GaussianNB)**

Each model was evaluated using standard classification metrics:

* **Accuracy Score**
* **Precision Score**
* **Recall Score**
* **F1 Score**

The results were then compared to determine the best-performing model for loan prediction.

---

## 📂 Dataset

Dataset used: **Loan Approval Dataset** (`loan_approval_data.csv`)

The dataset contains features related to the applicant's profile, financial standing, and employment history.

Typical features include:

* Applicant Income & Coapplicant Income
* Credit Score
* Loan Amount & Loan Term
* DTI Ratio (Debt-to-Income)
* Savings & Collateral Value
* Employment Status & Employer Category
* Education Level & Dependents

Target Variable: `Loan_Approved`

* `Yes` → Loan is approved
* `No` → Loan is rejected

---

## 🛠 Technologies Used

* Python
* NumPy
* Pandas
* Scikit-learn
* Matplotlib
* Seaborn
* Jupyter Notebook

---

## ⚙️ Models Implemented

### 1️⃣ Logistic Regression

`LogisticRegression()`

A standard baseline model used for binary classification tasks, modeling the probability of loan approval.

---

### 2️⃣ K-Nearest Neighbors (KNN)

`KNeighborsClassifier()`

A non-parametric, distance-based algorithm that classifies a loan application based on the approval status of its nearest neighbors in the feature space.

---

### 3️⃣ Gaussian Naive Bayes

`GaussianNB()`

A probabilistic classifier based on Bayes' theorem, assuming that the continuous features follow a normal (Gaussian) distribution.

---

## 📊 Model Evaluation

The models were evaluated using multiple metrics. Below is a snapshot of the performance:

| Model                | Accuracy  | Precision | Recall    | F1 Score  |
| -------------------- | --------- | --------- | --------- | --------- |
| Gaussian Naive Bayes | **~0.86** | **~0.81** | **~0.70** | **~0.75** |
| Logistic Regression  | ~0.84     | ~0.79     | ~0.68     | ~0.73     |
| K-Nearest Neighbors  | ~0.78     | ~0.72     | ~0.65     | ~0.68     |

*(Note: Exact metrics for Logistic Regression and KNN may vary slightly based on train-test splits; refer to the notebook for exact run outputs).*

---

## 🏆 Best Model

The **Gaussian Naive Bayes** classifier performed the best among the tested models.

Reasons:

* Highest accuracy (86.0%)
* Best precision (81.1%), meaning fewer false positives (approving bad loans)
* Solid balance between Recall and F1-score

---

## 📈 Future Improvements

Possible improvements to the project:

* Hyperparameter tuning using **GridSearchCV** or **RandomizedSearchCV**
* Handling potential class imbalance using techniques like **SMOTE**
* Implementing ensemble methods such as **Random Forest** or **XGBoost**
* Cross-validation to ensure model stability
* Plotting evaluation visualisations such as:
  * Confusion Matrix Heatmaps
  * ROC-AUC Curves

---

## ▶️ How to Run

1. Clone the repository

`git clone https://github.com/SAHIL-AGARWAL-IN/loan_approval_classifier.git`

2. Navigate to the project folder

`cd loan-approval-classification`

3. Install dependencies

`pip install numpy pandas matplotlib seaborn scikit-learn jupyter`

4. Run the Jupyter Notebook

`jupyter notebook`

*(Open `loan_approval_classifier.ipynb` and run all cells)*

---

## 📚 Learning Outcomes

Through this project you will learn:

* Data preprocessing (Handling missing values with `SimpleImputer`)
* Categorical encoding (`LabelEncoder`, `OneHotEncoder`)
* Feature scaling (`StandardScaler`)
* Implementation of various classification algorithms
* Model evaluation and comparing machine learning models
