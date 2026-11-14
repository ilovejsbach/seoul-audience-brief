"""Publish built static output to gh-pages without uploading raw data or API keys."""
import pathlib,subprocess,tempfile,shutil
root=pathlib.Path(__file__).resolve().parents[1]
def run(args,cwd=root):subprocess.run(args,cwd=cwd,check=True)
run(['npm','run','build'])
remote=subprocess.check_output(['git','remote','get-url','origin'],cwd=root,text=True).strip()
with tempfile.TemporaryDirectory(prefix='seoul-pages-') as folder:
 p=pathlib.Path(folder)
 shutil.copytree(root/'dist',p,dirs_exist_ok=True)
 (p/'.nojekyll').touch()
 run(['git','init','-b','gh-pages'],p)
 run(['git','add','.'],p)
 run(['git','-c','user.name=Codex','-c','user.email=codex@users.noreply.github.com','commit','-m','Publish verified Seoul briefing dashboard'],p)
 run(['git','remote','add','origin',remote],p)
 # Refuse overwriting any existing published branch; updates need a normal branch checkout.
 exists=subprocess.run(['git','ls-remote','--exit-code','--heads','origin','gh-pages'],cwd=root,stdout=subprocess.DEVNULL).returncode==0
 if exists:
  run(['git','fetch','origin','gh-pages'],p)
  # Connect this rebuilt artifact to the prior published history without changing source.
  run(['git','reset','--soft','FETCH_HEAD'],p)
  run(['git','-c','user.name=Codex','-c','user.email=codex@users.noreply.github.com','commit','-m','Update verified Seoul briefing dashboard'],p)
 run(['git','push','origin','gh-pages'],p)
