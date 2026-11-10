# Fase 1 · Bucket S3 seguro con Terraform + LocalStack

![Terraform](https://img.shields.io/badge/Terraform-1.15-7B42BC?logo=terraform&logoColor=white)
![LocalStack](https://img.shields.io/badge/LocalStack-2026.10-6C3EF4)
![AWS CLI](https://img.shields.io/badge/AWS_CLI-S3-FF9900?logo=amazonaws&logoColor=white)

Bucket S3 simulado en LocalStack, creado con Terraform, con **cifrado AES-256** y **bloqueo de acceso público**.

## Resultado

| Control | Estado | Evidencia |
|---|---|---|
| Bucket creado | ✅ `actividad3-seguro-local` | `evidencias/verificacion-s3.txt` |
| Cifrado SSE-S3 | ✅ `AES256` | `evidencias/verificacion-s3.txt` |
| Block Public Access | ✅ 4/4 en `true` | `evidencias/verificacion-s3.txt` |
| ACL | ✅ solo propietario | `evidencias/verificacion-s3.txt` |
| Terraform apply | ✅ 3 recursos | `evidencias/terraform-apply.txt` |
| Terraform idempotente | ✅ `No changes` | `evidencias/terraform-plan-idempotente.txt` |
| Acceso anónimo | ⚠️ `200 OK` en LocalStack | `evidencias/acceso-anonimo.txt` |

> **Limitación del simulador:** LocalStack no aplica todas las reglas de autorización de AWS. El bloqueo público está declarado y consultado correctamente, pero una lectura anónima puede responder `200`. En AWS real, con los cuatro controles activos y sin política pública, la lectura anónima se deniega.

## Requisitos

| Herramienta | Versión usada |
|---|---|
| Docker Engine | 29.9.3 |
| Docker Compose | 5.7.0 |
| Terraform | 1.15.9 |
| AWS CLI | 2.37.9 |
| LocalStack | 2026.10.6 (`pro`, plan Freemium — antes *Hobby*) |

Salida completa: [`evidencias/versiones.txt`](evidencias/versiones.txt).

## Checklist de evidencias

| Evidencia solicitada | Archivo |
|---|---|
| Versiones de herramientas y LocalStack saludable | [`evidencias/versiones.txt`](evidencias/versiones.txt) |
| Archivos de configuración sin credenciales | `compose.yaml`, `providers.tf`, `main.tf`, `.env.example` |
| Validación, plan y aplicación de Terraform | [`evidencias/terraform-validate.txt`](evidencias/terraform-validate.txt), [`evidencias/terraform-plan.txt`](evidencias/terraform-plan.txt), [`evidencias/terraform-apply.txt`](evidencias/terraform-apply.txt) |
| Cifrado AES-256 y 4 controles de bloqueo | [`evidencias/verificacion-s3.txt`](evidencias/verificacion-s3.txt) |
| Carga del archivo y acceso anónimo | [`evidencias/subida-archivo.txt`](evidencias/subida-archivo.txt), [`evidencias/acceso-anonimo.txt`](evidencias/acceso-anonimo.txt) |
| Dashboard con el bucket creado | [`evidencias/S3.png`](evidencias/S3.png) |
| Plan gratuito de LocalStack (Freemium / Hobby) | [`evidencias/plan-localstack.txt`](evidencias/plan-localstack.txt) |
| Repositorio público verificado | <https://github.com/Hugoatpxndx/actividad3-ciberseguridad> |

> **Plan de LocalStack:** el plan gratuito aparece hoy como **Freemium** en el panel web (la guía lo llama *Hobby — Free*). Es el mismo plan: `Emulator Access → AWS · Freemium`, créditos ilimitados y sin funciones de pago. El plan activo se registra en [`evidencias/plan-localstack.txt`](evidencias/plan-localstack.txt) y el estado del emulador en [`evidencias/versiones.txt`](evidencias/versiones.txt).

## Recursos creados

| Recurso Terraform | Función |
|---|---|
| `aws_s3_bucket.secure_bucket` | Crea el bucket privado |
| `aws_s3_bucket_server_side_encryption_configuration.secure_bucket_sse` | Activa SSE-S3 con AES-256 |
| `aws_s3_bucket_public_access_block.secure_bucket_pab` | Activa los 4 controles de bloqueo público |

## Ejecución

```bash
# 1. Token de LocalStack (plan gratuito: Freemium / Hobby)
cp .env.example .env
# edita .env y pega tu LOCALSTACK_AUTH_TOKEN

# 2. Levantar LocalStack
docker compose up -d

# 3. Terraform
terraform init
terraform validate
terraform plan -out=tfplan
terraform apply tfplan

# 4. Verificar
export AWS_ACCESS_KEY_ID=test AWS_SECRET_ACCESS_KEY=test AWS_DEFAULT_REGION=us-east-1
aws --endpoint-url=http://localhost:4566 s3api get-bucket-encryption --bucket actividad3-seguro-local
aws --endpoint-url=http://localhost:4566 s3api get-public-access-block --bucket actividad3-seguro-local
```

## Estructura

```
fase1/
├── compose.yaml
├── providers.tf
├── main.tf
├── .env.example
├── .gitignore
└── evidencias/
```

## Nota sobre `get-bucket-policy-status`

El comando devuelve `NoSuchBucketPolicy` porque no hay una política de bucket adjunta. Eso **no** significa que el bucket sea público: el bloqueo público y la ACL privada son controles independientes.
