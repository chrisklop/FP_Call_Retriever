# Dashboard Overview

The Call Retriever dashboard provides a comprehensive view of your clinic's call analytics with both summary and detailed reporting capabilities.

## Layout Structure

### Header Section
![Dashboard Header](https://via.placeholder.com/800x200/EFF6FF/1E40AF?text=Dashboard+Header)

The header contains:
- **Title**: "Call Retriever" with subtitle "Clinic Call Metrics"
- **Stats Cards**: Three key metrics displayed prominently
- **Company Logo**: Positioned in the top-right corner

### Stats Cards

#### Total Call Legs
- **Description**: Total number of individual call records
- **Color**: Blue background (`bg-blue-50`)
- **Value**: Real-time count from database (e.g., 75,645)

#### Total Calls  
- **Description**: Unique calls grouped by correlation ID
- **Color**: Green background (`bg-green-50`)
- **Value**: Aggregated unique call count (e.g., 23,206)

#### Locations
- **Description**: Number of clinic locations in system
- **Color**: Purple background (`bg-purple-50`) 
- **Value**: Count of distinct locations (e.g., 304)

### Navigation Modes

#### Summary Report Mode
- **Default View**: Shows clinic-level aggregated data
- **Features**: 
  - Clinic selection dropdown
  - Date range filtering
  - Call counts per clinic
  - "View Details" action buttons

#### Detailed View Mode
- **Purpose**: Individual call record inspection
- **Features**:
  - Location filtering
  - Date/time filtering
  - Call view mode toggle (Aggregated vs Individual)
  - Pagination controls

## Key Interface Elements

### Mode Toggle Buttons
```
[Summary Report] [Detailed View]
```
- **Active State**: Blue background (`bg-blue-600`)
- **Inactive State**: Gray background (`bg-gray-200`)

### Filter Controls

#### Summary Mode Filters
1. **Clinic Dropdown**: Select specific clinic or "All Clinics"
2. **Start Date**: Date picker for range beginning
3. **End Date**: Date picker for range end

#### Detailed Mode Filters
1. **Location Filter**: Dropdown to filter by clinic location
2. **Start Date**: Date picker for filtering call records
3. **End Date**: Date picker for filtering call records  
4. **Call View Mode**: Toggle between aggregated calls and individual call legs

### Data Tables

#### Summary Report Table
| Column | Description |
|--------|-------------|
| Clinic | Clinic/location name |
| Total Calls | Unique calls (correlation ID grouped) |
| Total Call Legs | Individual call records |
| Answered | Number and percentage of answered calls |
| Avg Duration | Average call duration in minutes/seconds |
| Actions | "View Details" button |

#### Detailed View Table
| Column | Description |
|--------|-------------|
| Start Time | Call initiation timestamp |
| Duration | Call length (formatted as Xm Ys) |
| Calling # | Caller phone number |
| Called # | Destination phone number |
| User | User/extension name |
| Location | Clinic location |
| Direction | Call direction (TERMINATING/ORIGINATING) |
| Leg Type | Call type (Initial/Transfer/Conference/Hold) |
| Answered | Yes/No with color coding |
| Outcome | Call result/disposition |
| Correlation ID | Last 6 characters with highlighting |

## Visual Design Elements

### Color Coding
- **Blue**: Call legs statistics and primary actions
- **Green**: Total calls and answered status
- **Purple**: Location information
- **Orange**: Transfer leg types
- **Yellow**: Hold leg types
- **Red**: Unanswered calls
- **Gray**: Initial/default leg types

### Typography
- **Headers**: Large, bold text for key metrics
- **Subheadings**: Medium weight for section titles
- **Data**: Clear, readable fonts for table content
- **Numbers**: Emphasized with larger font sizes

### Responsive Design
- **Desktop**: Full multi-column layout
- **Tablet**: Responsive grid adjustments
- **Mobile**: Stacked layout for smaller screens

## Analytics Section

### Call Correlation Analytics
Located below the main data table, this section provides three analytical widgets:

#### Peak Call Hours
- **Visual**: Horizontal bar chart
- **Data**: Call volume by hour
- **Purpose**: Identify busy periods

#### Call Outcomes  
- **Visual**: Progress bars with percentages
- **Data**: Outcome distribution (Completed, No Answer, Busy, Failed)
- **Purpose**: Success rate analysis

#### Location Performance
- **Visual**: Progress indicators
- **Data**: Answer rates and average wait times per location
- **Purpose**: Clinic performance comparison

## Navigation Flow

1. **Default State**: Dashboard loads in Summary mode
2. **Summary Analysis**: Review clinic-level metrics
3. **Drill Down**: Click "View Details" for specific clinic
4. **Detailed Analysis**: Examine individual call records
5. **Filtering**: Apply date/location filters as needed
6. **Return**: Use mode toggle to return to summary

## Real-time Updates

The dashboard connects to live data sources:
- **Auto-refresh**: Data updates automatically
- **Loading States**: Spinner indicators during data fetch
- **Error Handling**: Graceful fallback for failed requests

---

Next: Learn about [Summary Reports](Summary-Reports) for detailed reporting features.