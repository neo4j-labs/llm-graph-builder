import pkg_resources

input_file = "requirements.txt"
output_file = "requirements_with_versions.txt"

with open(input_file, "r") as f:
    packages = [line.strip() for line in f if line.strip() and not line.startswith("#")]

with open(output_file, "w") as out:
    for pkg in packages:
        # Handle extras (e.g., unstructured[all-docs])
        pkg_name = pkg.split("[")[0] if "[" in pkg else pkg
        try:
            version = pkg_resources.get_distribution(pkg_name).version
            out.write(f"{pkg}=={version}\n")
        except Exception:
            out.write(f"{pkg}\n")  # If not installed, just write the name

print(f"Written installed versions to {output_file}")