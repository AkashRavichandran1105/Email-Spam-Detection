# Lifecycle stage 3 — Data Understanding
 
import pandas as pd
 
def load_data(path):
    return pd.read_csv(path, encoding='latin-1',usecols=[0, 1])
    df.columns = ['label', 'message']
    return df