#!/bin/bash
# 🚨 Guide de Dépannage - Erreur de Chargement
# Usage: ./debug.sh

echo "🔍 DIAGNOSTIC DES ERREURS DE CHARGEMENT"
echo "======================================"
echo ""

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Fonction pour vérifier un service
check_service() {
    local service_name=$1
    local port=$2
    local path=${3:-"/"}
    
    echo -e "${BLUE}🔍 Checking $service_name${NC}"
    
    # Vérifier si le container existe et tourne
    if docker ps --format "table {{.Names}}\t{{.Status}}" | grep -q "$service_name"; then
        echo -e "   ${GREEN}✅ Container is running${NC}"
        
        # Vérifier le port
        if nc -z localhost $port 2>/dev/null; then
            echo -e "   ${GREEN}✅ Port $port is accessible${NC}"
            
            # Vérifier HTTP response
            response=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:$port$path" 2>/dev/null)
            if [ "$response" = "200" ]; then
                echo -e "   ${GREEN}✅ HTTP responds with 200${NC}"
            else
                echo -e "   ${RED}❌ HTTP responds with $response${NC}"
            fi
        else
            echo -e "   ${RED}❌ Port $port is not accessible${NC}"
        fi
    else
        echo -e "   ${RED}❌ Container is not running${NC}"
        
        # Vérifier si le container existe mais est arrêté
        if docker ps -a --format "table {{.Names}}\t{{.Status}}" | grep -q "$service_name"; then
            echo -e "   ${YELLOW}⚠️  Container exists but is stopped${NC}"
            echo -e "   ${BLUE}💡 Try: docker start $service_name${NC}"
        else
            echo -e "   ${RED}❌ Container does not exist${NC}"
            echo -e "   ${BLUE}💡 Try: docker-compose up -d $service_name${NC}"
        fi
    fi
    echo ""
}

# Fonction pour vérifier les logs d'un service
check_logs() {
    local service_name=$1
    local lines=${2:-20}
    
    echo -e "${BLUE}📋 Last $lines lines from $service_name logs:${NC}"
    echo "----------------------------------------"
    
    if docker ps --format "{{.Names}}" | grep -q "$service_name"; then
        docker logs --tail $lines "$service_name" 2>&1 | while IFS= read -r line; do
            if echo "$line" | grep -i error >/dev/null; then
                echo -e "${RED}$line${NC}"
            elif echo "$line" | grep -i warn >/dev/null; then
                echo -e "${YELLOW}$line${NC}"
            else
                echo "$line"
            fi
        done
    else
        echo -e "${RED}Container $service_name is not running${NC}"
    fi
    echo ""
}

# Fonction pour vérifier la configuration Nginx
check_nginx_config() {
    echo -e "${BLUE}🔧 Checking Nginx Configuration${NC}"
    
    if docker ps --format "{{.Names}}" | grep -q "sa_nginx"; then
        echo "Testing nginx configuration syntax..."
        if docker exec sa_nginx nginx -t 2>&1; then
            echo -e "${GREEN}✅ Nginx configuration is valid${NC}"
        else
            echo -e "${RED}❌ Nginx configuration has errors${NC}"
            echo -e "${BLUE}💡 Check your .conf files for syntax errors${NC}"
        fi
    else
        echo -e "${RED}❌ Nginx container is not running${NC}"
    fi
    echo ""
}

# Fonction pour vérifier les volumes
check_volumes() {
    echo -e "${BLUE}📁 Checking Docker Volumes${NC}"
    echo "Available volumes:"
    docker volume ls | grep -E "(sa_|nginx_|mysql_|redis_)" | while read line; do
        echo "   $line"
    done
    echo ""
    
    echo "Volume usage:"
    docker system df -v | grep -A 20 "Local Volumes:" | grep -E "(sa_|nginx_|mysql_|redis_)" | while read line; do
        echo "   $line"
    done
    echo ""
}

# Fonction pour vérifier la connectivité réseau
check_network() {
    echo -e "${BLUE}🌐 Checking Network Connectivity${NC}"
    
    # Vérifier le réseau Docker
    echo "Docker network 'sa_network':"
    if docker network ls | grep -q "sa_network"; then
        echo -e "   ${GREEN}✅ Network exists${NC}"
        docker network inspect sa_network --format '{{range .Containers}}{{.Name}}: {{.IPv4Address}}{{"\n"}}{{end}}' | while read line; do
            echo "   $line"
        done
    else
        echo -e "   ${RED}❌ Network 'sa_network' does not exist${NC}"
        echo -e "   ${BLUE}💡 Try: docker network create sa_network${NC}"
    fi
    echo ""
}

# Fonction pour créer une configuration Nginx simplifiée
create_minimal_nginx_config() {
    echo -e "${YELLOW}🛠️  Creating minimal nginx configuration for testing${NC}"
    
    cat > /tmp/minimal-nginx.conf << 'EOF'
server {
    listen 80;
    server_name localhost 192.168.1.45;
    
    # Test endpoint
    location /test {
        return 200 "Nginx is working!\n";
        add_header Content-Type text/plain;
    }
    
    # Frontend
    location / {
        proxy_pass http://frontend:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # Backend API (sans cache temporairement)
    location /api {
        proxy_pass http://backend:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # CORS
        add_header Access-Control-Allow-Origin "http://192.168.1.45:3000" always;
        add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS" always;
        add_header Access-Control-Allow-Headers "Origin, Content-Type, Accept, Authorization, X-Requested-With" always;
        add_header Access-Control-Allow-Credentials true always;
        
        if ($request_method = 'OPTIONS') {
            add_header Access-Control-Allow-Origin "http://192.168.1.45:3000";
            add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS";
            add_header Access-Control-Allow-Headers "Origin, Content-Type, Accept, Authorization, X-Requested-With";
            add_header Access-Control-Allow-Credentials true;
            add_header Content-Length 0;
            add_header Content-Type text/plain;
            return 204;
        }
    }
}
EOF
    
    echo "Minimal configuration created at /tmp/minimal-nginx.conf"
    echo -e "${BLUE}💡 To use this config:${NC}"
    echo "   cp /tmp/minimal-nginx.conf nginx/default.conf"
    echo "   docker-compose restart nginx"
    echo ""
}

# DÉBUT DU DIAGNOSTIC
echo -e "${GREEN}🚀 Starting diagnostic...${NC}"
echo "Time: $(date)"
echo ""

# 1. Vérifier les services principaux
echo -e "${BLUE}📊 SERVICES STATUS${NC}"
echo "=================="
docker-compose ps 2>/dev/null || echo "⚠️  docker-compose.yml may have issues"
echo ""

# 2. Vérifier chaque service individuellement
check_service "sa_nginx" 80 "/test"
check_service "sa_backend" 8000 "/api/test"
check_service "sa_frontend" 3000 "/"
check_service "sa_mysql" 3307

# 3. Vérifier la configuration Nginx
check_nginx_config

# 4. Vérifier les logs des services problématiques
echo -e "${BLUE}📋 CHECKING LOGS${NC}"
echo "==============="
check_logs "sa_nginx" 15
check_logs "sa_backend" 15
check_logs "sa_frontend" 10

# 5. Vérifier les volumes et la connectivité
check_volumes
check_network

# 6. Tests de connectivité directs
echo -e "${BLUE}🔗 CONNECTIVITY TESTS${NC}"
echo "==================="

echo "Testing direct connections:"
echo -n "Backend (localhost:8000): "
if curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/api/test 2>/dev/null | grep -q "200"; then
    echo -e "${GREEN}✅ OK${NC}"
else
    echo -e "${RED}❌ Failed${NC}"
fi

echo -n "Frontend (localhost:3000): "
if curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 2>/dev/null | grep -q "200"; then
    echo -e "${GREEN}✅ OK${NC}"
else
    echo -e "${RED}❌ Failed${NC}"
fi

echo -n "Nginx (localhost:80): "
if curl -s -o /dev/null -w "%{http_code}" http://localhost:80 2>/dev/null | grep -q "200"; then
    echo -e "${GREEN}✅ OK${NC}"
else
    echo -e "${RED}❌ Failed${NC}"
fi

echo ""

# 7. Suggestions de réparation
echo -e "${YELLOW}🛠️  COMMON FIXES${NC}"
echo "==============="
echo "1. Restart all services:"
echo "   docker-compose down && docker-compose up -d"
echo ""
echo "2. Rebuild containers:"
echo "   docker-compose down && docker-compose up --build -d"
echo ""
echo "3. Clean restart (removes volumes):"
echo "   docker-compose down -v && docker-compose up --build -d"
echo ""
echo "4. Check for port conflicts:"
echo "   netstat -tulpn | grep -E ':(80|3000|8000|3307)'"
echo ""
echo "5. Use minimal nginx config temporarily:"
echo "   (see function above)"
echo ""

# 8. Génération de la config minimale si nécessaire
echo -e "${BLUE}💡 Would you like to generate a minimal nginx config for testing?${NC}"
echo "This will help isolate the cache configuration issues."
echo ""
create_minimal_nginx_config

echo -e "${GREEN}🏁 Diagnostic completed!${NC}"
echo ""
echo -e "${BLUE}Next steps:${NC}"
echo "1. Check the red ❌ items above"
echo "2. Use the suggested fixes"
echo "3. If still having issues, share the specific error messages"
echo "4. Consider using the minimal nginx config temporarily"