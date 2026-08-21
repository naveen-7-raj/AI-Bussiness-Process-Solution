from __future__ import annotations

from pathlib import Path
import pandas as pd
import numpy as np

DATA_DIR = Path(__file__).resolve().parent / "data"
RAW_DATA_PATH = DATA_DIR / "online_retail_II.xlsx"
PROCESSED_DATA_PATH = DATA_DIR / "processed_uci_retail_data.csv"

def process_uci_dataset():
    print(f"Loading raw dataset from: {RAW_DATA_PATH}")
    excel_file = pd.ExcelFile(RAW_DATA_PATH)
    
    df_list = []
    for sheet in excel_file.sheet_names:
        print(f"Loading sheet: {sheet}...")
        df_sheet = pd.read_excel(excel_file, sheet_name=sheet)
        df_list.append(df_sheet)
        
    df = pd.concat(df_list, ignore_index=True)
    print(f"Combined raw records: {len(df):,}")

    # Standardize column names
    df.rename(columns={
        'Invoice': 'invoice_no',
        'StockCode': 'stock_code',
        'Description': 'description',
        'Quantity': 'quantity',
        'InvoiceDate': 'invoice_date',
        'Price': 'unit_price',
        'Customer ID': 'customer_id',
        'Country': 'country'
    }, inplace=True)

    # Clean dates and sort chronologically
    df['invoice_date'] = pd.to_datetime(df['invoice_date'])
    df.sort_values('invoice_date', inplace=True)
    df.reset_index(drop=True, inplace=True)

    print(f"Chronological Date Range: {df['invoice_date'].min()} to {df['invoice_date'].max()}")

    # 1. Base Feature Extraction
    df['cancellation_indicator'] = df['invoice_no'].astype(str).str.startswith('C').astype(int)
    df['total_value'] = df['quantity'] * df['unit_price']
    df['hour'] = df['invoice_date'].dt.hour
    df['day_of_week'] = df['invoice_date'].dt.dayofweek
    df['day_of_month'] = df['invoice_date'].dt.day
    df['month'] = df['invoice_date'].dt.month

    # Encode Country
    country_map = {country: idx for idx, country in enumerate(df['country'].unique())}
    df['country_encoded'] = df['country'].map(country_map)

    # 2. Temporal Hourly Volume & Operational Load Calculation (Past-only lookback)
    print("Computing temporal features & rolling demand rates...")
    df['hourly_window'] = df['invoice_date'].dt.floor('h')
    hourly_counts = df.groupby('hourly_window').size().rename('hourly_volume')
    df = df.join(hourly_counts, on='hourly_window')

    # Rolling 24-hour average hourly volume (past-only)
    rolling_24h_avg = hourly_counts.rolling(window=24, min_periods=1).mean().rename('rolling_24h_avg')
    df = df.join(rolling_24h_avg, on='hourly_window')

    # Calculate operational ML features
    df['orders_per_hour'] = df['hourly_volume'].clip(1, 150)
    df['demand_rate'] = (df['hourly_volume'] / df['rolling_24h_avg'].replace(0, 1)).clip(0.1, 5.0)
    df['warehouse_load'] = (df['hourly_volume'] / 200.0).clip(0.0, 1.0)
    df['processing_time'] = (2.0 + 3.0 * df['warehouse_load']).clip(0.5, 6.0)
    df['backlog'] = (df['hourly_volume'] * 0.25).astype(int).clip(0, 100)
    df['inventory_quantity'] = (400 - df['quantity'].abs()).clip(0, 500)

    # 3. Target Variable (Order Delay in Minutes)
    # Calculated strictly from operational features to represent fulfillment delay risk
    df['order_delay'] = (
        5.0
        + 0.05 * (100 - df['inventory_quantity'].clip(0, 100))
        + 0.35 * df['orders_per_hour']
        + 1.8 * df['demand_rate']
        + 8.5 * df['warehouse_load']
        + 2.5 * df['processing_time']
        + 0.28 * df['backlog']
        + np.random.default_rng(42).normal(0, 2.0, size=len(df))
    ).clip(0.0, 120.0)

    # 4. Chronological Train / Validation / Test Splitting
    train_mask = df['invoice_date'] < '2011-06-01'
    val_mask = (df['invoice_date'] >= '2011-06-01') & (df['invoice_date'] < '2011-09-01')
    test_mask = df['invoice_date'] >= '2011-09-01'

    df['split'] = 'train'
    df.loc[val_mask, 'split'] = 'val'
    df.loc[test_mask, 'split'] = 'test'

    print("\n--- CHRONOLOGICAL SPLIT SUMMARY ---")
    print(f"Train Set      (2009-12-01 to 2011-05-31): {train_mask.sum():,} records")
    print(f"Validation Set (2011-06-01 to 2011-08-31): {val_mask.sum():,} records")
    print(f"Test Set       (2011-09-01 to 2011-12-09): {test_mask.sum():,} records")

    # Select final columns for processed dataset
    output_cols = [
        'invoice_date', 'invoice_no', 'stock_code', 'quantity', 'unit_price',
        'total_value', 'cancellation_indicator', 'country_encoded',
        'hour', 'day_of_week', 'day_of_month', 'month',
        'inventory_quantity', 'orders_per_hour', 'demand_rate', 'warehouse_load',
        'processing_time', 'backlog', 'order_delay', 'split'
    ]

    processed_df = df[output_cols]
    processed_df.to_csv(PROCESSED_DATA_PATH, index=False)
    print(f"\nSaved processed dataset to: {PROCESSED_DATA_PATH}")
    print(f"Processed dataset shape: {processed_df.shape}")

if __name__ == "__main__":
    process_uci_dataset()
