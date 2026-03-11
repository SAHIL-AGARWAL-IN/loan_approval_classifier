import streamlit as st
import pandas as pd
import numpy as np
import pickle

# --- 1. Load the Saved Model and Preprocessing Objects ---
try:
    with open('gnb_model.pkl', 'rb') as file:
        model = pickle.load(file)
    with open('scaler.pkl', 'rb') as file:
        scaler = pickle.load(file)
    with open('encoder.pkl', 'rb') as file:
        ohe = pickle.load(file)
    with open('label_encoders.pkl', 'rb') as file:
        le_education = pickle.load(file)
except FileNotFoundError:
    st.error("⚠️ Error: Missing .pkl files. Please ensure 'gnb_model.pkl', 'scaler.pkl', 'ohe.pkl', and 'le_education.pkl' are in the same folder.")
    st.stop()

# --- 2. Build the Streamlit UI ---
st.set_page_config(page_title="Loan Approval Predictor", page_icon="🏦", layout="centered")
st.title("🏦 CLEAR: Loan Approval Classifier")
st.write("Enter the applicant's financial and demographic details below.")

col1, col2 = st.columns(2)

with col1:
    st.subheader("👤 Applicant Details")
    gender = st.selectbox("Gender", ["Male", "Female"])
    age = st.number_input("Age", min_value=18, max_value=100, value=35)
    marital_status = st.selectbox("Marital Status", ["Single", "Married"])
    dependents = st.number_input("Dependents", min_value=0, max_value=10, value=0)
    education = st.selectbox("Education Level", ["Graduate", "Not Graduate"])
    employment_status = st.selectbox("Employment Status", ["Salaried", "Self-employed", "Contract", "Unemployed"])
    employer_category = st.selectbox("Employer Category", ["Government", "Private", "MNC", "Business", "Unemployed"])

with col2:
    st.subheader("💰 Financial Details")
    applicant_income = st.number_input("Applicant Income ($)", min_value=0.0, value=50000.0)
    coapplicant_income = st.number_input("Co-applicant Income ($)", min_value=0.0, value=0.0)
    savings = st.number_input("Savings ($)", min_value=0.0, value=10000.0)
    credit_score = st.number_input("Credit Score", min_value=300.0, max_value=900.0, value=650.0)
    dti_ratio = st.number_input("Debt-to-Income (DTI) Ratio", min_value=0.0, max_value=1.0, value=0.30, format="%.2f")
    existing_loans = st.number_input("Number of Existing Loans", min_value=0.0, max_value=10.0, value=1.0)

st.subheader("🏠 Loan Details")
col3, col4 = st.columns(2)
with col3:
    loan_amount = st.number_input("Loan Amount Requested ($)", min_value=0.0, value=15000.0)
    loan_term = st.selectbox("Loan Term (Months)", [12.0, 24.0, 36.0, 48.0, 60.0, 72.0, 84.0])
with col4:
    collateral_value = st.number_input("Collateral Value ($)", min_value=0.0, value=20000.0)
    loan_purpose = st.selectbox("Loan Purpose", ["Home", "Car", "Education", "Personal", "Business"])
    property_area = st.selectbox("Property Area", ["Urban", "Semiurban", "Rural"])

# --- 3. Make the Prediction ---
if st.button("Predict Loan Eligibility 🚀", use_container_width=True):
    
    # Capture all inputs in a dictionary
    input_dict = {
        'Applicant_Income': [applicant_income],
        'Coapplicant_Income': [coapplicant_income],
        'Employment_Status': [employment_status],
        'Age': [age],
        'Marital_Status': [marital_status],
        'Dependents': [dependents],
        'Credit_Score': [credit_score],
        'Existing_Loans': [existing_loans],
        'DTI_Ratio': [dti_ratio],
        'Savings': [savings],
        'Collateral_Value': [collateral_value],
        'Loan_Amount': [loan_amount],
        'Loan_Term': [loan_term],
        'Loan_Purpose': [loan_purpose],
        'Property_Area': [property_area],
        'Education_Level': [education],
        'Gender': [gender],
        'Employer_Category': [employer_category]
    }
    
    input_df = pd.DataFrame(input_dict)

    try:
        # 1. LABEL ENCODING for Education_Level
        input_df['Education_Level'] = le_education.transform(input_df['Education_Level'])

        # 2. ONE-HOT ENCODING for the rest of the text columns
        ohe_cols = ["Employment_Status", "Marital_Status", "Loan_Purpose", "Property_Area", "Gender", "Employer_Category"]
        
        encoded_ohe = ohe.transform(input_df[ohe_cols])
        # Convert to dense array if OneHotEncoder returned a sparse matrix
        if hasattr(encoded_ohe, "toarray"):
            encoded_ohe = encoded_ohe.toarray()

        # 3. GET NUMERIC COLUMNS (Everything else, including the now-numeric Education_Level)
        numeric_cols = ['Applicant_Income', 'Coapplicant_Income', 'Age', 'Dependents', 'Credit_Score', 
                        'Existing_Loans', 'DTI_Ratio', 'Savings', 'Collateral_Value', 'Loan_Amount', 
                        'Loan_Term', 'Education_Level']
        numeric_data = input_df[numeric_cols].values

        # 4. COMBINE NUMERIC AND OHE DATA
        # Note: Ensure this order matches how you concatenated them in your Jupyter Notebook!
        final_features = np.hstack((numeric_data, encoded_ohe))

        # 5. SCALE THE DATA
        scaled_features = scaler.transform(final_features)
        
        # 6. PREDICT
        prediction = model.predict(scaled_features)
        
        # Output the Result
        if prediction[0] == 1 or prediction[0] == 'Yes':
            st.success("✅ Congratulations! The loan is likely to be APPROVED.")
            st.balloons()
        else:
            st.error("❌ We're sorry, the loan is likely to be DENIED based on the current risk profile.")

    except Exception as e:
        st.error(f"Prediction Error: {e}")
        st.info("Tip: Check if the column concatenation order in step 4 perfectly matches your X_train column order in Jupyter.")