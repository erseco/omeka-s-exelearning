# ExeLearning Module for Omeka S

This module allows users to view and edit eXeLearning (.elpx) files directly within Omeka S.

## Features

- **View eXeLearning content**: Display interactive educational content in an embedded viewer
- **Edit in browser**: Edit .elpx files using the eXeLearning editor without leaving Omeka S
- **Automatic thumbnails**: Generates visual thumbnails from the content's first page
- **Secure content delivery**: All content is served through a secure proxy with CSP headers

## How It Works

### Viewing Content

When you upload an .elpx file to Omeka S:

1. The module extracts the contents to a secure directory
2. An interactive preview is displayed in an iframe
3. Users can open the content in a new tab or download the original file

### Editing Content

The module provides an "Edit in eXeLearning" button for administrators:

1. Click the button to open the full-screen editor modal
2. Make your changes using the familiar eXeLearning interface
3. Click "Save to Omeka" to save changes back to your media item
4. The modal closes and the preview updates automatically

### Architecture

```
Upload .elpx → Extract to /files/exelearning/{hash}/ → View via secure proxy
                                                            ↓
                                                      Edit in modal
                                                            ↓
                                                     Save back to Omeka
```

## Installation

### Requirements

- Omeka S 4.0 or later
- PHP 7.4 or later with ZipArchive extension
- nginx or Apache web server

### Manual Installation

1. Download the latest release from the GitHub repository
2. Extract to your Omeka S `modules` directory as `ExeLearning`
3. Log in to the Omeka S admin panel and navigate to Modules
4. Click "Install" next to ExeLearning

### Server Configuration

#### nginx

Add these rules to your nginx configuration to ensure proper security:

```nginx
# Block direct access to extracted files
location ^~ /files/exelearning/ {
    return 403;
}

# Route content proxy to PHP
location ^~ /exelearning/content/ {
    try_files $uri /index.php$is_args$args;
}
```

#### Apache

The module includes an `.htaccess` file that handles security automatically.

## Usage

### Uploading eXeLearning Files

1. Navigate to an Item in Omeka S
2. Click "Add media" and select your .elpx file
3. Save the item
4. The eXeLearning content will be displayed in the media viewer

### Editing Files

1. Go to the media page (Admin > Items > [Your Item] > [Media])
2. Click "Edit in eXeLearning" button
3. Edit your content in the modal
4. Click "Save to Omeka" to save your changes

### Public Display

eXeLearning content is automatically displayed on public item pages using an embedded viewer.

## Local Development with Docker

This repository includes a **Makefile** and `docker-compose.yml` for local development.

### Quick start

```bash
make up
```

Then open [http://localhost:8080](http://localhost:8080).

### Preconfigured users

| Email               | Role         | Password        |
|---------------------|--------------|-----------------|
| admin@example.com   | global_admin | PLEASE_CHANGEME |

### Useful Make commands

* `make up` - Start Docker containers in interactive mode
* `make upd` - Start in detached mode (background)
* `make down` - Stop and remove containers
* `make shell` - Open a shell inside the Omeka S container
* `make lint` - Run PHP_CodeSniffer
* `make fix` - Auto-fix coding style issues
* `make package VERSION=1.2.3` - Build a `.zip` release
* `make build-editor` - Fetch and build editor from `main` (shallow)

Run `make help` for a full list.

### Editor Source Selection

By default, `make build-editor` fetches `https://github.com/exelearning/exelearning` from `main` using a shallow checkout.
You can force a specific tag or branch at build time:

```bash
EXELEARNING_EDITOR_REF=vX.Y.Z EXELEARNING_EDITOR_REF_TYPE=tag make build-editor
# or
EXELEARNING_EDITOR_REF=my-feature EXELEARNING_EDITOR_REF_TYPE=branch make build-editor
```

The release workflow also supports manual runs (`workflow_dispatch`) and automatic package generation when pushing a tag.


## Security

This module implements several security measures:

- **Iframe sandboxing**: Prevents content from accessing parent page resources
- **Content Security Policy**: Restricts what resources content can load
- **Secure proxy**: All content served through PHP with validation
- **CSRF protection**: API endpoints require valid tokens
- **ACL integration**: Respects Omeka S permissions

For detailed security information, see [claude.md](claude.md).

## Troubleshooting

### Content not displaying

- Check that ZipArchive PHP extension is installed
- Verify nginx/Apache configuration blocks are in place
- Check file permissions on `/files/exelearning/` directory

### Editor not loading

- Ensure the `dist/static` directory contains the eXeLearning editor files
- Check browser console for JavaScript errors

### Save not working

- Verify user has "update" permission for media
- Check that CSRF token is valid (try refreshing the page)

## License

This module is licensed under the GPL-3.0 License.

## Credits

- Based on the [wp-exelearning](https://github.com/exelearning/wp-exelearning) WordPress plugin
- Uses the [eXeLearning](https://exelearning.net/) editor
