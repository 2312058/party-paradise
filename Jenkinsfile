pipeline {
    agent any
    
    stages {
        stage('Checkout') {
            steps {
                echo '📥 Checking out code from GitHub...'
                git branch: 'main',
                    url: 'https://github.com/2312058/party-paradise.git'
            }
        }
        
        stage('Build Images') {
            steps {
                echo '🔨 Building Docker images...'
                bat 'docker-compose build'
            }
        }
        
        stage('Stop Old Containers') {
    steps {
        echo '⏹️ Stopping old containers...'
        bat '''
            docker-compose down || exit 0
            docker rm -f party-paradise-db || exit 0
            docker rm -f party-paradise-backend || exit 0
            docker rm -f party-paradise-frontend || exit 0
        '''
    }
}
        
        stage('Start New Containers') {
            steps {
                echo '🚀 Starting new containers...'
                bat 'docker-compose up -d'
            }
        }
        
        stage('Health Check') {
            steps {
                echo '🏥 Checking application health...'
                bat 'timeout /t 15'
                bat 'curl -f http://localhost:5000/health || exit 1'
            }
        }
    }
    
    post {
        success {
            echo '✅ Deployment Successful!'
            echo '🌐 Frontend: http://localhost'
            echo '⚙️  Backend: http://localhost:5000'
        }
        failure {
            echo '❌ Deployment Failed!'
            bat 'docker-compose logs'
        }
    }
}