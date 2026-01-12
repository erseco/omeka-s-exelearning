# Makefile for ExeLearning Omeka-S Module

# Define SED_INPLACE based on the operating system
ifeq ($(shell uname), Darwin)
  SED_INPLACE = sed -i ''
else
  SED_INPLACE = sed -i
endif

# Detect the operating system
ifeq ($(OS),Windows_NT)
    ifdef MSYSTEM
        SYSTEM_OS := unix
    else ifdef CYGWIN
        SYSTEM_OS := unix
    else
        SYSTEM_OS := windows
    endif
else
    SYSTEM_OS := unix
endif

.PHONY: help check-docker check-bun up upd down pull build lint fix shell clean \
        update-submodule build-editor build-editor-no-update clean-editor \
        package generate-pot update-po check-untranslated compile-mo i18n test

# ============================================================================
# eXeLearning Editor Build
# ============================================================================

check-bun:
	@command -v bun >/dev/null 2>&1 || { \
		echo "Error: Bun is not installed."; \
		echo "Install from: https://bun.sh/"; \
		exit 1; \
	}

update-submodule:
	@echo "Updating eXeLearning submodule..."
	git submodule update --init --remote exelearning
	cd exelearning && git checkout release/3.1-embedable-version-refactor
	@echo "Submodule updated to release/3.1-embedable-version-refactor"

build-editor: check-bun update-submodule
	@echo "Building eXeLearning static editor..."
	cd exelearning && bun install && bun run build:static
	@echo "Copying static build to dist/static..."
	rm -rf dist/static
	mkdir -p dist
	cp -r exelearning/dist/static dist/static
	@echo "Static editor built successfully at dist/static/"

build-editor-no-update: check-bun
	@echo "Building eXeLearning static editor (no submodule update)..."
	cd exelearning && bun install && bun run build:static
	rm -rf dist/static
	mkdir -p dist
	cp -r exelearning/dist/static dist/static
	@echo "Static editor built successfully at dist/static/"

clean-editor:
	@echo "Cleaning editor build artifacts..."
	rm -rf dist/static
	rm -rf exelearning/dist/static
	rm -rf exelearning/node_modules
	@echo "Editor artifacts cleaned"

# ============================================================================
# Docker Management
# ============================================================================

check-docker:
ifeq ($(SYSTEM_OS),windows)
	@echo "Detected system: Windows (cmd, powershell)"
	@docker version > NUL 2>&1 || (echo. & echo Error: Docker is not running. & exit 1)
else
	@echo "Detected system: Unix (Linux/macOS/Cygwin/MinGW)"
	@docker version > /dev/null 2>&1 || (echo "Error: Docker is not running." && exit 1)
endif

up: check-docker
	docker compose up --remove-orphans

upd: check-docker
	docker compose up --detach --remove-orphans

down: check-docker
	docker compose down

pull: check-docker
	docker compose -f docker-compose.yml pull

build: check-docker
	docker compose build

shell: check-docker
	docker compose exec omekas sh

clean: check-docker
	docker compose down -v --remove-orphans

# ============================================================================
# Code Quality
# ============================================================================

lint:
	vendor/bin/phpcs . --standard=PSR2 --ignore=vendor/,node_modules/,exelearning/,dist/,test/ --colors --extensions=php

fix:
	vendor/bin/phpcbf . --standard=PSR2 --ignore=vendor/,node_modules/,exelearning/,dist/,test/ --colors --extensions=php

test:
	@echo "Running unit tests..."
	"vendor/bin/phpunit" -c test/phpunit.xml

# ============================================================================
# Packaging
# ============================================================================

package:
	@if [ -z "$(VERSION)" ]; then \
		echo "Error: VERSION not specified. Use 'make package VERSION=1.2.3'"; \
		exit 1; \
	fi
	@echo "Updating version to $(VERSION) in module.ini..."
	$(SED_INPLACE) 's/^\([[:space:]]*version[[:space:]]*=[[:space:]]*\).*$$/\1"$(VERSION)"/' config/module.ini
	@echo "Creating ZIP archive: ExeLearning-$(VERSION).zip..."
	composer archive --format=zip --file="ExeLearning-$(VERSION)-raw"
	@echo "Repacking into proper structure..."
	mkdir -p tmpzip/ExeLearning && unzip -q ExeLearning-$(VERSION)-raw.zip -d tmpzip/ExeLearning && \
	cd tmpzip && zip -qr ../ExeLearning-$(VERSION).zip ExeLearning && cd .. && rm -rf tmpzip ExeLearning-$(VERSION)-raw.zip
	@echo "Restoring version to 0.0.0 in module.ini..."
	$(SED_INPLACE) 's/^\([[:space:]]*version[[:space:]]*=[[:space:]]*\).*$$/\1"0.0.0"/' config/module.ini
	@echo "Package created: ExeLearning-$(VERSION).zip"

# ============================================================================
# Translations (i18n)
# ============================================================================

generate-pot:
	@echo "Extracting strings using xgettext..."
	find . -path ./vendor -prune -o -path ./exelearning -prune -o -path ./dist -prune -o \
		\( -name '*.php' -o -name '*.phtml' \) -print \
	| xargs xgettext \
	    --language=PHP \
	    --from-code=utf-8 \
	    --keyword=translate \
	    --keyword=translatePlural:1,2 \
	    --output=language/xgettext.pot
	@echo "Extracting strings marked with // @translate..."
	vendor/zerocrates/extract-tagged-strings/extract-tagged-strings.php > language/tagged.pot
	@echo "Merging xgettext.pot and tagged.pot into template.pot..."
	msgcat language/xgettext.pot language/tagged.pot --use-first -o language/template.pot
	@rm -f language/xgettext.pot language/tagged.pot
	@echo "Generated language/template.pot"

update-po:
	@echo "Updating translation files..."
	@find language -name "*.po" | while read po; do \
		echo "Updating $$po..."; \
		msgmerge --update --backup=off "$$po" language/template.pot; \
	done

check-untranslated:
	@echo "Checking untranslated strings..."
	@find language -name "*.po" | while read po; do \
		echo "\n$$po:"; \
		msgattrib --untranslated "$$po" | if grep -q msgid; then \
			echo "Warning: Untranslated strings found!"; exit 1; \
		else \
			echo "All strings translated!"; \
		fi \
	done

compile-mo:
	@echo "Compiling .po files into .mo..."
	@find language -name '*.po' | while read po; do \
		mo=$${po%.po}.mo; \
		msgfmt "$$po" -o "$$mo"; \
		echo "Compiled $$po -> $$mo"; \
	done

i18n: generate-pot update-po check-untranslated compile-mo

# ============================================================================
# Help
# ============================================================================

help:
	@echo ""
	@echo "ExeLearning Omeka-S Module"
	@echo "========================="
	@echo ""
	@echo "eXeLearning Editor:"
	@echo "  update-submodule       - Update eXeLearning git submodule"
	@echo "  build-editor           - Build static editor from submodule"
	@echo "  build-editor-no-update - Build without updating submodule (for CI/CD)"
	@echo "  clean-editor           - Remove editor build artifacts"
	@echo ""
	@echo "Docker management:"
	@echo "  up                     - Start Docker containers in interactive mode"
	@echo "  upd                    - Start Docker containers in background (detached)"
	@echo "  down                   - Stop and remove Docker containers"
	@echo "  build                  - Build or rebuild Docker containers"
	@echo "  pull                   - Pull the latest images from the registry"
	@echo "  clean                  - Stop containers and remove volumes"
	@echo "  shell                  - Open a shell inside the omekas container"
	@echo ""
	@echo "Code quality:"
	@echo "  lint                   - Run PHP linter (PHP_CodeSniffer)"
	@echo "  fix                    - Automatically fix PHP code style issues"
	@echo "  test                   - Run unit tests with PHPUnit"
	@echo ""
	@echo "Packaging:"
	@echo "  package VERSION=x.y.z  - Generate a .zip package of the module"
	@echo ""
	@echo "Translations (i18n):"
	@echo "  generate-pot           - Extract translatable strings to template.pot"
	@echo "  update-po              - Update .po files from template.pot"
	@echo "  check-untranslated     - Check for untranslated strings"
	@echo "  compile-mo             - Compile .mo files from .po files"
	@echo "  i18n                   - Run full translation workflow"
	@echo ""

.DEFAULT_GOAL := help
