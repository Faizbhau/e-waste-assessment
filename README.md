# E-Waste Component Assessment System

An AI-powered web application for automated quality assessment of reusable e-waste components leveraging machine learning techniques with PyTorch.

## Project Overview

This e-waste component assessment system utilizes deep learning techniques to analyze images of electronic components and determine their quality, reusability, and proper classification. The goal is to reduce electronic waste by facilitating the identification and reuse of viable components that would otherwise be discarded.

The project combines computer vision for image analysis with a comprehensive database system to track assessment results and provide valuable insights through data visualization.

## Features

- Upload and analyze images of electronic components
- AI-based quality assessment and categorization
- Interactive dashboard with historical assessment data
- Component catalog with detailed information
- Statistical analysis and data visualization
- Search and filter functionality for past assessments
- Comprehensive reusability guidelines

## Technologies Used

- **Backend**: Python, Flask, SQLAlchemy
- **Database**: PostgreSQL
- **Machine Learning**: PyTorch, Computer Vision
- **Frontend**: HTML, CSS, JavaScript, Bootstrap
- **Data Visualization**: Chart.js

## Setup and Installation

1. Clone the repository:
   ```
   git clone https://github.com/Faizbhau/e-waste-assessment.git
   cd e-waste-assessment
   ```

2. Install dependencies:
   ```
   pip install -r requirements.txt
   ```

3. Set up your database:
   - Create a PostgreSQL database
   - Set the DATABASE_URL environment variable

4. Run the application:
   ```
   python main.py
   ```

## Project Structure

- `/templates` - HTML templates for the web interface
- `/static` - CSS, JavaScript, and images for the frontend
- `/uploads` - Directory for uploaded component images
- `/models.py` - Database models
- `/utils.py` - Utility functions for ML model interaction
- `/app.py` - Application routes and controllers
- `/main.py` - Application entry point

## Future Enhancements

- Expand the range of component types that can be assessed
- Implement more sophisticated quality determination algorithms
- Add user authentication and role-based access
- Integrate with inventory management systems

## Author

Mohd Faiz  
M.Tech, Computer Science and Engineering  
Vellore Institute of Technology, Chennai

- Email: mfaiz7166@gmail.com
- LinkedIn: [www.linkedin.com/in/mofaiz786](https://www.linkedin.com/in/mofaiz786)
- GitHub: [Faizbhau](https://github.com/Faizbhau)

## License

This project is licensed under the MIT License - see the LICENSE file for details.