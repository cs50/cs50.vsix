import setuptools

setuptools.setup(
    name="CS50 VSIX Client",
    version="1.0.0",
    author="CS50",
    author_email="sysadmins@cs50.harvard.edu",
    description="A companion of the CS50 visual studio code extension.",
    url="https://github.com/cs50/cs50vsix",
    license="GPLv3",
    classifiers=[
        "Programming Language :: Python :: 3.6"
    ],
    packages=["clean50", "command50", "debug50", "lab50", "prompt50"],
    entry_points={
        "console_scripts": [
            "clean50=clean50.__main__:main",
            "command50=command50.__main__:main",
            "debug50=debug50.__main__:main",
            "lab50=lab50.__main__:main",
            "rebuild50=command50.__main__:rebuild",
            "prompt50=prompt50.__main__:main"
        ]
    },
    install_requires=["asyncio", "websockets"]
)
