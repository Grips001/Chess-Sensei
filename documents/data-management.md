# Data Management User Guide

Chess-Sensei stores all your game data locally on your device. This guide covers
how to export, import, and backup your data.

## Accessing Data Management

1. From the main menu, click the **Data Management** button in the header
2. The Data Management overlay opens with three main options

## Export Data

Export your games, profile, or create a full backup.

### Export Single Game

Export one game for sharing or archival:

1. Click **Export Data**
2. Select **Single Game**
3. Choose the format:
   - **PGN**: Standard chess notation, compatible with most chess software
   - **JSON**: Full game data including analysis
4. Select the game from the dropdown
5. Click **Export Game**
6. File is saved to the exports folder

### Export All Games

Export your entire game history:

1. Click **Export Data**
2. Select **All Games**
3. Optionally check "Include analysis data" for complete records
4. Click **Export All Games**
5. A single JSON file is created with all games

### Export Player Profile

Export your statistics and progress:

1. Click **Export Data**
2. Select **Player Profile**
3. Click **Export Profile**
4. JSON file saved with your metrics, composite scores, and trends

### Export Full Backup

Create a complete backup of everything:

1. Click **Export Data**
2. Select **Full Backup**
3. Click **Create Backup**
4. Single file contains all games, analyses, and profile

## Import Data

Import previously exported data or games from other sources.

### Import JSON File

Import Chess-Sensei export files:

1. Click **Import Data**
2. Select **JSON File**
3. Choose your file (single game or batch)
4. Click **Import JSON**
5. Duplicates are automatically detected and skipped

### Import PGN File

Import games from standard PGN files:

1. Click **Import Data**
2. Select **PGN File**
3. Choose your PGN file
4. Click **Import PGN**
5. Imported games will need analysis (run automatically)

### Merge Player Profiles

Combine stats from multiple devices:

1. Click **Import Data**
2. Select **Merge Profiles**
3. Choose the profile export file
4. Click **Merge Profile**
5. Statistics are combined using weighted averages

## Backup & Restore

Manage automatic and manual backups.

### Automatic Backups

Chess-Sensei can automatically backup your data:

1. Click **Backup & Restore**
2. Check **Enable automatic backups**
3. Select frequency:
   - **Daily**: Creates backup once per day
   - **Weekly**: Creates backup once per week
   - **After each game**: Creates backup after every Exam Mode game
4. Click **Save Settings**

### Backup Retention

Chess-Sensei automatically manages backup storage:

- **Daily backups**: Keeps the last 7
- **Weekly backups**: Keeps the last 4
- Older backups are automatically deleted

### Create Manual Backup

Create a backup at any time:

1. Click **Backup & Restore**
2. Click **Create Full Backup Now**
3. Backup is saved to both exports and backups folders

### View Available Backups

See your existing backups:

1. Click **Backup & Restore**
2. The **Available Backups** section shows recent backups
3. Each entry shows:
   - Date and time
   - Backup type (daily, weekly, after-game)
   - Number of games
   - File size

### Verify Backup Integrity

Check that a backup file is valid:

1. Click **Backup & Restore**
2. Find the backup in the list
3. Click **Verify**
4. Results show if backup is valid or has issues

### Restore from Backup

Restore your data from a backup file:

1. Click **Backup & Restore**
2. In **Restore from File**, choose your backup file
3. Click **Restore Backup**
4. Confirm the restore operation
5. **Warning**: This overwrites your current data!

## Storage Location

Your data is stored at:

| Platform | Location                                      |
| -------- | --------------------------------------------- |
| Windows  | `%APPDATA%\Chess-Sensei\`                     |
| macOS    | `~/Library/Application Support/Chess-Sensei/` |
| Linux    | `~/.local/share/chess-sensei/`                |

### Folder Structure

```text
Chess-Sensei/
├── games/          # Saved game files (by year/month)
├── analysis/       # Game analysis results
├── metrics/        # Player profile and achievements
├── settings/       # User preferences
├── exports/        # Exported files
└── backups/        # Automatic backups
```

Click **Open Data Folder** to view your files in the file explorer.

## File Formats

### PGN Format

Standard Portable Game Notation:

```text
[Event "Chess-Sensei Exam Mode"]
[Site "Chess-Sensei"]
[Date "2025.03.15"]
[White "Player"]
[Black "Club Player (1600)"]
[Result "1-0"]

1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 ... 1-0
```

Compatible with Lichess, Chess.com, and most chess software.

### JSON Format

Complete game data including analysis:

- Game metadata (opponent, result, duration)
- All moves with timestamps
- Full engine analysis
- Move classifications
- Critical moments

### Backup Format

Full backup includes:

- All games
- All analyses
- Player profile
- Achievements

## Tips

### Regular Backups

- Enable automatic daily backups for peace of mind
- Create manual backups before device changes
- Keep backup copies on external storage or cloud

### Migrating Devices

1. Export a full backup from your old device
2. Copy the backup file to your new device
3. Install Chess-Sensei on the new device
4. Import the backup file

### Sharing Games

- Use PGN format for maximum compatibility
- JSON format preserves analysis data
- PGN can be pasted directly into chess websites

## Troubleshooting

### Backup Failed

- Check available disk space
- Ensure the app has write permissions
- Try creating backup in a different location

### Import Shows Duplicates Skipped

- Games with matching IDs are not re-imported
- This prevents duplicate entries
- Original analysis is preserved

### Restore Doesn't Work

- Verify the backup file with the Verify button
- Check that the file is a valid Chess-Sensei backup
- Ensure the file wasn't corrupted during transfer

## Related Documentation

- [User Guide](./user-guide.md) - General Chess-Sensei usage
- [FAQ](./faq.md) - Frequently asked questions
