# Call Retriever Wiki

Welcome to the Call Retriever documentation! This wiki provides comprehensive guides for installation, usage, and development.

## 📚 Documentation Sections

### 🚀 Getting Started
- **[Home](Home.md)** - Project overview and key features
- **[Installation](Installation.md)** - Complete setup guide
- **[Quick Start](Quick-Start.md)** - Get up and running quickly
- **[Configuration](Configuration.md)** - Environment and settings

### 👤 User Guides  
- **[Dashboard Overview](Dashboard-Overview.md)** - Interface walkthrough
- **[Summary Reports](Summary-Reports.md)** - Clinic-level analytics
- **[Detailed Analysis](Detailed-Analysis.md)** - Individual call inspection
- **[Filtering & Search](Filtering-Search.md)** - Data filtering options

### 🔧 Technical Documentation
- **[Architecture](Architecture.md)** - System design and components
- **[Database Schema](Database-Schema.md)** - Data structure and relationships
- **[API Documentation](API-Documentation.md)** - REST API reference
- **[Frontend Components](Frontend-Components.md)** - React component library

### 🛠️ Administration
- **[Data Import](Data-Import.md)** - CDR data import procedures
- **[Performance Tuning](Performance-Tuning.md)** - Optimization guidelines
- **[Troubleshooting](Troubleshooting.md)** - Common issues and solutions
- **[Production Setup](Production-Setup.md)** - Deployment guide

### ❓ Support
- **[FAQ](FAQ.md)** - Frequently asked questions
- **[Contributing](Contributing.md)** - Development guidelines
- **[Changelog](Changelog.md)** - Version history

## 🏗️ System Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │    Backend      │    │   Database      │
│  (Next.js)      │◄──►│   (Express)     │◄──►│   (SQLite)      │
│  Port: 3000     │    │  Port: 3001     │    │   cdr_data.db   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 📊 Key Metrics

- **📞 Total Call Legs**: 75,645 individual call records
- **🔗 Unique Calls**: 23,206 calls (grouped by correlation ID)
- **🏥 Clinic Locations**: 304 healthcare facilities
- **⚡ Performance**: Real-time dashboard with <2s load times

## 🎯 Quick Links

**For Users:**
- [View Dashboard Overview](Dashboard-Overview.md)
- [Learn Summary Reports](Summary-Reports.md)
- [Troubleshoot Issues](Troubleshooting.md)

**For Developers:**
- [API Reference](API-Documentation.md)
- [Database Schema](Database-Schema.md)
- [Architecture Guide](Architecture.md)

**For Administrators:**
- [Installation Guide](Installation.md)
- [Data Import](Data-Import.md)
- [Production Setup](Production-Setup.md)

## 🔄 Recent Updates

**v1.0.0** (July 2025)
- ✅ Initial release with full feature set
- ✅ Correlation ID aggregation
- ✅ Transfer/conference call identification  
- ✅ Real-time dashboard updates
- ✅ Date range filtering
- ✅ Multi-clinic support

## 📞 Support

Need help? Check these resources:

1. **[Troubleshooting Guide](Troubleshooting.md)** - Common issues
2. **[FAQ](FAQ.md)** - Frequently asked questions  
3. **GitHub Issues** - Report bugs or request features
4. **API Health Check** - http://localhost:3001/api/health

## 🏷️ Tags

`healthcare` `cdr` `analytics` `dashboard` `next.js` `sqlite` `call-center` `metrics`

---

**Last Updated**: July 2025  
**Version**: 1.0.0  
**Contributors**: Development Team