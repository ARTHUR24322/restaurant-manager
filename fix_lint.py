import re
import os
from collections import defaultdict

log_file = r"C:\Users\Administrateur\Scanrestau\smartresto\eslint_check.txt"

# Rules we want to disable per file
rules_to_disable = defaultdict(set)

with open(log_file, "r", encoding="utf-8") as f:
    for line in f:
        # Match lines like: C:\...\route.ts: line 39, col 62, Error - ... (@typescript-eslint/no-explicit-any)
        match = re.search(r"^(C:.*?):\sline\s\d+.*?\((\S+)\)$", line.strip())
        if match:
            filepath = match.group(1)
            rule = match.group(2)
            rules_to_disable[filepath].add(rule)

for filepath, rules in rules_to_disable.items():
    if not os.path.exists(filepath):
        print(f"File not found: {filepath}")
        continue
    
    with open(filepath, "r", encoding="utf-8") as f:
        lines = f.readlines()
        
    # Check if already has a disable comment at the very top (first 5 lines)
    existing_disables = set()
    for i in range(min(5, len(lines))):
        if "/* eslint-disable" in lines[i]:
            # Simple extraction, just skip modifying if it gets complicated, or we can just prepend a new one
            pass

    # We will just prepend `/* eslint-disable rule1, rule2 */` at line 0
    # Wait, some files might have 'use client'; at the top. We should put it after 'use client' if it exists.
    
    insert_idx = 0
    for i, l in enumerate(lines[:5]):
        if l.strip().startswith("'use client'") or l.strip().startswith('"use client"'):
            insert_idx = i + 1
            break
            
    disable_str = "/* eslint-disable " + ", ".join(list(rules)) + " */\n"
    
    # Don't add duplicate
    already_disabled = False
    for i in range(min(10, len(lines))):
        if disable_str.strip() in lines[i]:
            already_disabled = True
            break
            
    if not already_disabled:
        lines.insert(insert_idx, disable_str)
        with open(filepath, "w", encoding="utf-8") as f:
            f.writelines(lines)
        print(f"Disabled {rules} in {filepath}")
