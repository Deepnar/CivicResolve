# CivicResolve System Diagrams

This directory contains all the system architecture diagrams for CivicResolve in Mermaid format.

## 📋 Available Diagrams

### **Core Architecture**
- `high-level-architecture.mmd` - Overall system architecture with all layers
- `database-erd.mmd` - Entity Relationship Diagram showing all database tables
- `deployment-architecture.mmd` - Production deployment infrastructure

### **Process Flows**
- `issue-creation-flow.mmd` - Sequence diagram for issue reporting process
- `appeal-workflow.mmd` - State diagram for appeal system workflow

## 🎨 How to Convert to Images

### **Method 1: Automatic Conversion Script**
```bash
# Install Mermaid CLI globally
npm install -g @mermaid-js/mermaid-cli

# Run the conversion script
./convert-diagrams.sh
```

This will create PNG and SVG versions of all diagrams in the `images/` folder.

### **Method 2: Online Editor**
1. Go to https://mermaid.live/
2. Copy the content from any `.mmd` file
3. Paste into the editor
4. Export as PNG, SVG, or PDF

### **Method 3: VS Code Preview**
1. Install the "Mermaid Preview" extension
2. Open any `.mmd` file
3. Press `Ctrl+Shift+P` and type "Mermaid: Preview"

### **Method 4: GitHub Rendering**
When you view the main documentation file on GitHub, all Mermaid diagrams render automatically.

## 📊 Diagram Descriptions

### **High-Level Architecture**
Shows the complete system with:
- Client Layer (Web, PWA, Mobile)
- Frontend Layer (Next.js, React, Tailwind)
- API Gateway Layer (Routes, Middleware, Validation)
- Business Logic Layer (Models, Services)
- Caching Layer (Redis, Server Cache)
- Data Layer (MySQL, File Storage)
- External Services (AI, Email, Maps)

### **Database ERD**
Complete entity relationship diagram showing:
- 12 main tables (users, issues, organizations, etc.)
- All foreign key relationships
- Primary and unique keys
- Data types and constraints

### **Issue Creation Flow**
Step-by-step sequence showing:
- User form submission
- AI auto-fill processing
- Database operations
- Cache invalidation
- Email notifications
- Response handling

### **Appeal Workflow**
State machine diagram showing:
- Appeal eligibility conditions
- Status transitions
- Admin review process
- Email notifications
- Final resolution states

### **Deployment Architecture**
Production infrastructure showing:
- Load balancer and CDN
- Multiple app servers
- Database cluster with read replicas
- Redis cluster
- File storage and security layers

## 🔧 Customizing Diagrams

To modify any diagram:
1. Edit the `.mmd` file with your changes
2. Test at https://mermaid.live/ first
3. Run the conversion script to generate new images
4. Update the main documentation if needed

## 📁 File Structure

```
docs/diagrams/
├── README.md                     # This file
├── convert-diagrams.sh          # Conversion script
├── high-level-architecture.mmd  # Main system architecture
├── database-erd.mmd            # Database relationships
├── issue-creation-flow.mmd     # Issue reporting process
├── appeal-workflow.mmd         # Appeal system states
├── deployment-architecture.mmd # Production infrastructure
└── images/                     # Generated image files
    ├── high-level-architecture.png
    ├── high-level-architecture.svg
    ├── database-erd.png
    ├── database-erd.svg
    └── ... (other generated images)
```

## 🎯 Best Practices

1. **Always test in Mermaid Live Editor** before committing changes
2. **Keep diagrams simple** - split complex diagrams into multiple files
3. **Use consistent naming** - follow existing naming conventions
4. **Document changes** - update this README when adding new diagrams
5. **Version control** - commit both `.mmd` source and generated images

## 🚀 Integration with Documentation

The main system documentation (`COMPLETE_SYSTEM_ARCHITECTURE.md`) references these diagrams. When making changes:

1. Update the diagram source file
2. Regenerate images using the script
3. Verify the main documentation still references correctly
4. Test rendering on GitHub/GitLab

---

*For questions about the diagrams or conversion process, refer to the main project documentation.*