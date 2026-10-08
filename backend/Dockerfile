FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /app
COPY pom.xml .
RUN mvn dependency:go-offline -B
COPY src ./src
RUN mvn clean package -DskipTests

FROM eclipse-temurin:21-jre
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar
EXPOSE 8080

COPY backend-entrypoint-secrets.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/backend-entrypoint-secrets.sh

ENTRYPOINT ["backend-entrypoint-secrets.sh"]
CMD ["java", "-Djava.security.egd=file:/dev/./urandom", "-jar", "app.jar"]