FROM mcr.microsoft.com/dotnet/sdk:10.0-noble AS build
WORKDIR /src

COPY SmartAccess.API.csproj .
RUN dotnet restore SmartAccess.API.csproj

COPY . .
RUN dotnet publish SmartAccess.API.csproj -c Release -o /app/publish

FROM mcr.microsoft.com/dotnet/aspnet:10.0-noble AS final
WORKDIR /app

COPY --from=build /app/publish .

RUN mkdir -p /app/Config

ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080


CMD sh -c "cp /etc/secrets/firebase-credentials.json /app/Config/firebase-credentials.json 2>/dev/null || true && dotnet SmartAccess.API.dll"