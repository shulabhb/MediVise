#!/usr/bin/env python3
"""
Simple script to help run the Supabase migration
"""

import os
import sys

def main():
    print("🚀 MediVise Supabase Migration Helper")
    print("=" * 50)
    print()
    print("You have two options to migrate your schema to Supabase:")
    print()
    print("OPTION 1: Manual SQL Migration (Recommended)")
    print("-" * 40)
    print("1. Go to your Supabase Dashboard:")
    print("   https://supabase.com/dashboard/project/xdptmfribajrxqhjqduv")
    print()
    print("2. Navigate to: SQL Editor")
    print()
    print("3. Copy and paste the contents of 'supabase_migration.sql'")
    print("   (This file contains all the table creation and RLS policies)")
    print()
    print("4. Click 'Run' to execute the migration")
    print()
    print("OPTION 2: Automated Migration")
    print("-" * 40)
    print("1. Set your Supabase password as an environment variable:")
    print("   export SUPABASE_PASSWORD='your_password_here'")
    print()
    print("2. Run the automated migration:")
    print("   python migrate_to_supabase.py")
    print()
    print("What's included in the migration:")
    print("✅ Added user_id column to ocr_documents table")
    print("✅ Created medications table with all medical fields")
    print("✅ Created appointments table with comprehensive fields")
    print("✅ Added proper indexes for performance")
    print("✅ Enabled Row Level Security (RLS) for user isolation")
    print("✅ Created RLS policies for data privacy")
    print("✅ Added triggers for automatic updated_at timestamps")
    print("✅ Created user_data_summary view for easy inspection")
    print()
    print("After migration, you can view your data in Supabase Studio!")
    
    choice = input("\nWould you like to proceed with Option 1 (manual)? (y/n): ").strip().lower()
    
    if choice == 'y':
        print("\n📋 Here's the SQL migration content:")
        print("=" * 50)
        
        try:
            with open('supabase_migration.sql', 'r') as f:
                content = f.read()
                print(content)
        except FileNotFoundError:
            print("❌ supabase_migration.sql file not found!")
            return False
        
        print("\n✅ Copy the above SQL and run it in your Supabase SQL Editor")
        print("🎉 After running, your schema will be fully migrated!")
        
    else:
        print("\n💡 To run the automated migration, set your password and run:")
        print("   export SUPABASE_PASSWORD='your_password'")
        print("   python migrate_to_supabase.py")
    
    return True

if __name__ == "__main__":
    main()
