## Project Sentry - Inventory Replenishment System

This is a Node.js backend platform for automating inventory replenishment with REST APIs, MongoDB database, and Kafka messaging. The system handles a 4-stage lifecycle: low-stock alerts, transfer order creation, warehouse shipment, and store receipt.

### Architecture
- **Backend**: Node.js with Express.js
- **Database**: MongoDB for maintaining digital thread
- **Messaging**: Kafka for stage orchestration
- **APIs**: REST endpoints for each lifecycle stage

### Key Requirements
- Maintain single source of truth for replenishment orders
- Generate unique identifiers for all major artifacts
- Implement state machine with proper status transitions
- Chain stages using Kafka topics

### Development Guidelines
- Use async/await for database operations
- Implement proper error handling and validation
- Follow RESTful API conventions
- Maintain comprehensive logging for traceability

### Project Status
✅ **Fully Operational System**:
- Express.js Server: Configured and ready
- MongoDB Integration: Database models and connections ready
- Kafka Event System: Complete event-driven architecture
- REST API Endpoints: All 4 workflow stages implemented
- Documentation: Complete README with API examples
- Testing: VS Code tasks configured for development

### Quick Start
1. Start MongoDB locally or update MONGODB_URI in .env
2. Run `npm run dev` to start the development server
3. Test with `curl http://localhost:3000/health`
4. Use the 4-stage API workflow as documented in README.md