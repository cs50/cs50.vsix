import setuptools


setuptools.setup(
    name="debug50",
    version="1.0.0",
    author="CS50",
    author_email="sysadmins@cs50.harvard.edu",
    description="A companion of the CS50 visual studio code extension to start the interactive debugger from terminal.",
    url="https://github.com/cs50/cs50vsix",
    license="GPLv3",
    classifiers=[
        "Programming Language :: Python :: 3.6"
    ],
    packages=["debug50"],
    entry_points={
        "console_scripts": ["debug50=debug50.__main__:main"]
    },
    install_requires=["asyncio", "websockets"]
)