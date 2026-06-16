FROM ubuntu:24.04 AS build

WORKDIR /src

RUN apt-get update && apt-get install -y wget apt-transport-https ca-certificates \
    && wget https://packages.microsoft.com/config/ubuntu/24.04/packages-microsoft-prod.deb \
    && dpkg -i packages-microsoft-prod.deb \
    && apt-get update \
    && apt-get install -y dotnet-sdk-10.0

COPY SmartAccess.API.csproj .
RUN dotnet restore SmartAccess.API.csproj

COPY . .
RUN dotnet publish SmartAccess.API.csproj -c Release -o /app/publish

FROM ubuntu:24.04 AS final

WORKDIR /app

RUN apt-get update && apt-get install -y wget apt-transport-https ca-certificates \
    && wget https://packages.microsoft.com/config/ubuntu/24.04/packages-microsoft-prod.deb \
    && dpkg -i packages-microsoft-prod.deb \
    && apt-get update \
    && apt-get install -y aspnetcore-runtime-10.0 \
    && rm -rf /var/lib/apt/lists/*

COPY --from=build /app/publish .

RUN mkdir -p /app/Config

ENV ASPNETCORE_URLS=http://+:8080

EXPOSE 8080

CMD sh -c "cp /etc/secrets/firebase-credentials.json /app/Config/firebase-credentials.json 2>/dev/null || true && dotnet SmartAccess.API.dll"